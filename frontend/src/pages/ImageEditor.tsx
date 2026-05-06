/**
 * ImageEditor — banner / image creation page.
 *
 * Ported from `image_creator/web/App.tsx` and adapted to the Content Creator
 * frontend:
 *  - Render is performed server-side via POST /api/banner/render (instead of
 *    a separate library-server endpoint).
 *  - Background and logo image picking goes through MediaPickerModal (which
 *    already implements Pexels/Unsplash search, AI generation, and Library
 *    upload/import).
 *  - Projects, color themes, and text templates persist via the backend's
 *    BannerProject / ColorTheme / TextTemplate Prisma models.
 *  - Custom fonts still use the localStorage + Google Fonts approach (the
 *    standalone editor's flow); the backend file-upload font endpoint is
 *    available but not wired here yet.
 *
 * Multi-card preview modes (Amazon DSP, Google Display, blog series, video
 * cards) and the video timeline editor were intentionally omitted from this
 * port — they require a server-side mp4 compositor that doesn't exist in
 * the Content Creator backend.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Player } from '@rendervid/player';
import toast from 'react-hot-toast';
import { BANNER_SIZES, getSize } from '../lib/bannerEditor/sizes';
import {
  buildBannerTemplate,
  DEFAULT_INPUTS,
  type BannerInputs,
  type TextStyle,
  type VerticalLayout,
  type WritingMode,
} from '../lib/bannerEditor/build-banner-template';
import { refreshCustomFonts } from '../lib/bannerEditor/font-loader';
import { FontPicker } from '../components/banner-editor/FontPicker';
import { TextStyleControls } from '../components/banner-editor/TextStyleControls';
import { FontsModal } from '../components/banner-editor/FontsModal';
import { renderLayerWithEffects } from '../components/banner-editor/CustomTextLayer';
import { DraggableLogoOverlay } from '../components/banner-editor/DraggableLogoOverlay';
import {
  ProjectStrip,
  ColorThemeStrip,
  TextTemplateStrip,
} from '../components/banner-editor/RibbonStrips';
import MediaPickerModal, { type PickedMedia } from '../components/modals/MediaPickerModal';
import { resolveMediaUrl } from '../api/media';
import { useLanguage } from '../context/LanguageContext';
import {
  cancelPending,
  completePending,
  getPendingIntent,
  subscribePendingIntent,
  type EditorPendingIntent,
} from '../lib/imageEditorBridge';
import {
  renderBanner,
  listProjects as apiListProjects,
  createProject as apiCreateProject,
  updateProject as apiUpdateProject,
  deleteProject as apiDeleteProject,
  listColorThemes as apiListColorThemes,
  listTextTemplates as apiListTextTemplates,
  createTextTemplate as apiCreateTextTemplate,
  updateTextTemplate as apiUpdateTextTemplate,
  deleteTextTemplate as apiDeleteTextTemplate,
  type BannerProject,
} from '../api/banner';

// ───── Local helpers ────────────────────────────────────────────────────────

type StyleKey = 'badgeStyle' | 'subtitleStyle' | 'titleStyle' | 'bodyStyle';
type TextKey = 'badge' | 'subtitle' | 'title' | 'body';
type HideKey = 'hideBadge' | 'hideSubtitle' | 'hideBody';

interface TextField {
  textKey: TextKey;
  styleKey: StyleKey;
  label: string;
  multiline?: boolean;
  hideKey?: HideKey;
}

const TEXT_FIELDS: TextField[] = [
  { textKey: 'badge',    styleKey: 'badgeStyle',    label: 'Badge',    hideKey: 'hideBadge',    multiline: true },
  { textKey: 'subtitle', styleKey: 'subtitleStyle', label: 'Subtitle', hideKey: 'hideSubtitle', multiline: true },
  { textKey: 'title',    styleKey: 'titleStyle',    label: 'Title',                              multiline: true },
  { textKey: 'body',     styleKey: 'bodyStyle',     label: 'Body',     hideKey: 'hideBody',     multiline: true },
];

const VERTICAL_LAYOUTS: Array<{ value: VerticalLayout; label: string; icon: string }> = [
  { value: 'top',    label: 'Top',    icon: '⬆' },
  { value: 'center', label: 'Center', icon: '⬌' },
  { value: 'bottom', label: 'Bottom', icon: '⬇' },
];

const WRITING_MODES: Array<{ value: WritingMode; label: string }> = [
  { value: 'horizontal',  label: 'Horizontal' },
  { value: 'vertical-rl', label: 'Vertical (unsupported)' },
];

function inputsEqual(a: BannerInputs, b: BannerInputs): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// Adapter — server records have `{ label, styles | colors }`; the strip components
// expect the localStorage shape `{ name, badgeStyle, ..., backgroundColor, ... }`.
interface ColorThemeStripItem {
  id: string;
  name: string;
  backgroundColor: string;
  textColor: string;
  badgeColor: string;
  isPreset?: boolean;
  createdAt: number;
  updatedAt: number;
}

interface TextTemplateStripItem {
  id: string;
  name: string;
  badgeStyle: TextStyle;
  subtitleStyle: TextStyle;
  titleStyle: TextStyle;
  bodyStyle: TextStyle;
  isPreset?: boolean;
  createdAt: number;
  updatedAt: number;
}

interface ProjectStripItem {
  id: string;
  name: string;
  inputs: BannerInputs;
  isPreset?: boolean;
  createdAt: number;
  updatedAt: number;
}

function adaptColorTheme(rec: { id: string; label: string; colors: unknown; isPreset?: boolean; createdAt: string; updatedAt: string }): ColorThemeStripItem | null {
  const c = rec.colors as { backgroundColor?: string; textColor?: string; badgeColor?: string } | null;
  if (!c) return null;
  return {
    id: rec.id,
    name: rec.label,
    backgroundColor: c.backgroundColor ?? '#0f172a',
    textColor: c.textColor ?? '#ffffff',
    badgeColor: c.badgeColor ?? '#ef4444',
    isPreset: rec.isPreset,
    createdAt: new Date(rec.createdAt).getTime(),
    updatedAt: new Date(rec.updatedAt).getTime(),
  };
}

function adaptTextTemplate(rec: { id: string; label: string; styles: unknown; isPreset?: boolean; createdAt: string; updatedAt: string }): TextTemplateStripItem | null {
  const s = rec.styles as {
    badgeStyle?: TextStyle;
    subtitleStyle?: TextStyle;
    titleStyle?: TextStyle;
    bodyStyle?: TextStyle;
  } | null;
  if (!s) return null;
  return {
    id: rec.id,
    name: rec.label,
    badgeStyle: s.badgeStyle ?? {},
    subtitleStyle: s.subtitleStyle ?? {},
    titleStyle: s.titleStyle ?? {},
    bodyStyle: s.bodyStyle ?? {},
    isPreset: rec.isPreset,
    createdAt: new Date(rec.createdAt).getTime(),
    updatedAt: new Date(rec.updatedAt).getTime(),
  };
}

function adaptProject(rec: BannerProject): ProjectStripItem {
  const data = rec.data as { inputs?: Partial<BannerInputs> } | null;
  const inputs = { ...DEFAULT_INPUTS, ...(data?.inputs ?? {}) } as BannerInputs;
  return {
    id: rec.id,
    name: rec.name,
    inputs,
    createdAt: new Date(rec.createdAt).getTime(),
    updatedAt: new Date(rec.updatedAt).getTime(),
  };
}

// ───── Component ────────────────────────────────────────────────────────────

export default function ImageEditor() {
  const { t } = useLanguage();
  const [sizeId, setSizeId] = useState<string>(BANNER_SIZES[0].id);
  const [inputs, setInputs] = useState<Required<BannerInputs>>(() => ({ ...DEFAULT_INPUTS }));
  const [bgLogoOpen, setBgLogoOpen] = useState(false);
  const [fontsOpen, setFontsOpen] = useState(false);

  // Picker modal state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'bg' | 'logo' | null>(null);

  const [projects, setProjects] = useState<ProjectStripItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const [colorThemes, setColorThemes] = useState<ColorThemeStripItem[]>([]);
  const [selectedColorThemeId, setSelectedColorThemeId] = useState<string | null>(null);

  const [textTemplates, setTextTemplates] = useState<TextTemplateStripItem[]>([]);
  const [selectedTextTemplateId, setSelectedTextTemplateId] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Round-trip from MediaPickerModal callers (ImageCard / CreateAvatarModal).
  // When `pending` is non-null, the editor shows a "Use this image" banner and,
  // once a render completes, we fire `completePending(url)` so the caller can
  // apply the final URL to the article image / avatar source.
  const [pending, setPending] = useState<EditorPendingIntent | null>(getPendingIntent());
  const [lastRenderedUrl, setLastRenderedUrl] = useState<string | null>(null);

  useEffect(() => {
    return subscribePendingIntent((p) => setPending(p));
  }, []);

  // When a pending intent arrives with prefill data, apply it once.
  const appliedPendingRef = useRef<EditorPendingIntent | null>(null);
  useEffect(() => {
    if (!pending || appliedPendingRef.current === pending) return;
    appliedPendingRef.current = pending;
    setInputs((prev) => ({
      ...prev,
      backgroundImageUrl: pending.prefillBackgroundUrl ?? prev.backgroundImageUrl,
      title: pending.initialTitle ?? prev.title,
    }));
    if (pending.initialSizeId) setSizeId(pending.initialSizeId);
    setLastRenderedUrl(null);
  }, [pending]);

  // Load custom fonts injected into <head>
  useEffect(() => {
    refreshCustomFonts();
  }, []);

  // Initial fetch
  useEffect(() => {
    apiListProjects()
      .then((items) => {
        const list = items.map(adaptProject);
        setProjects(list);
      })
      .catch((e) => console.error('listProjects failed', e));
    apiListColorThemes()
      .then((items) => {
        const list = items.map(adaptColorTheme).filter((x): x is ColorThemeStripItem => x !== null);
        setColorThemes(list);
      })
      .catch((e) => console.error('listColorThemes failed', e));
    apiListTextTemplates()
      .then((items) => {
        const list = items.map(adaptTextTemplate).filter((x): x is TextTemplateStripItem => x !== null);
        setTextTemplates(list);
      })
      .catch((e) => console.error('listTextTemplates failed', e));
  }, []);

  const size = getSize(sizeId);
  const template = useMemo(() => buildBannerTemplate(size, inputs), [size, inputs]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;
  const hasUnsavedChanges = selectedProject
    ? !inputsEqual(inputs, { ...DEFAULT_INPUTS, ...selectedProject.inputs })
    : true;

  const selectedTextTemplate = textTemplates.find((t) => t.id === selectedTextTemplateId) ?? null;
  const textTemplateHasUnsavedChanges = selectedTextTemplate
    ? JSON.stringify({
        badgeStyle: inputs.badgeStyle,
        subtitleStyle: inputs.subtitleStyle,
        titleStyle: inputs.titleStyle,
        bodyStyle: inputs.bodyStyle,
      }) !==
      JSON.stringify({
        badgeStyle: selectedTextTemplate.badgeStyle,
        subtitleStyle: selectedTextTemplate.subtitleStyle,
        titleStyle: selectedTextTemplate.titleStyle,
        bodyStyle: selectedTextTemplate.bodyStyle,
      })
    : false;

  // ── Patch helpers ────────────────────────────────────────────────────────
  function patchText(k: TextKey, v: string) {
    setInputs((p) => ({ ...p, [k]: v }));
  }
  function patchStyle(k: StyleKey, v: TextStyle) {
    setInputs((p) => ({ ...p, [k]: v }));
  }
  function patchColor(k: 'backgroundColor' | 'textColor' | 'badgeColor', v: string) {
    setInputs((p) => ({ ...p, [k]: v }));
  }
  function patchVertical(v: VerticalLayout) {
    setInputs((p) => ({ ...p, verticalLayout: v }));
  }
  function patchWriting(v: WritingMode) {
    setInputs((p) => ({ ...p, writingMode: v }));
  }
  function patchBgImage(url: string) {
    setInputs((p) => ({ ...p, backgroundImageUrl: url }));
  }
  function patchBgImageOpacity(o: number) {
    setInputs((p) => ({ ...p, backgroundImageOpacity: o }));
  }
  function patchBgImageOffsetX(v: number) {
    setInputs((p) => ({ ...p, backgroundImageOffsetX: v }));
  }
  function patchBgImageOffsetY(v: number) {
    setInputs((p) => ({ ...p, backgroundImageOffsetY: v }));
  }
  function patchBgImageScale(v: number) {
    setInputs((p) => ({ ...p, backgroundImageScale: v }));
  }
  function patchLogoUrl(url: string) {
    setInputs((p) => ({ ...p, logoUrl: url }));
  }
  function patchLogoPosition(pos: NonNullable<BannerInputs['logoPosition']>) {
    setInputs((p) => ({ ...p, logoPosition: pos }));
  }
  function patchLogoSize(v: number) {
    setInputs((p) => ({ ...p, logoSize: v }));
  }
  function patchLogoMargin(v: number) {
    setInputs((p) => ({ ...p, logoMargin: v }));
  }
  function patchLogoOpacity(v: number) {
    setInputs((p) => ({ ...p, logoOpacity: v }));
  }

  // ── Templates / themes ───────────────────────────────────────────────────
  function applyTextTemplate(t: TextTemplateStripItem) {
    setSelectedTextTemplateId(t.id);
    setInputs((p) => ({
      ...p,
      badgeStyle: t.badgeStyle,
      subtitleStyle: t.subtitleStyle,
      titleStyle: t.titleStyle,
      bodyStyle: t.bodyStyle,
    }));
  }

  function applyColorTheme(c: ColorThemeStripItem) {
    setSelectedColorThemeId(c.id);
    setInputs((p) => ({
      ...p,
      backgroundColor: c.backgroundColor,
      textColor: c.textColor,
      badgeColor: c.badgeColor,
    }));
  }

  // ── Project CRUD via backend ─────────────────────────────────────────────
  function selectProject(id: string) {
    const p = projects.find((x) => x.id === id);
    if (!p) return;
    setSelectedProjectId(id);
    setInputs({ ...DEFAULT_INPUTS, ...p.inputs });
    setSelectedTextTemplateId(null);
    setSelectedColorThemeId(null);
  }

  async function reloadProjects(selectId?: string | null) {
    try {
      const items = await apiListProjects();
      const list = items.map(adaptProject);
      setProjects(list);
      if (selectId !== undefined) setSelectedProjectId(selectId);
    } catch (e) {
      console.error('reloadProjects failed', e);
    }
  }

  async function createNewProject() {
    const name = prompt(t('iePromptProjectName'), t('iePromptNewProject'));
    if (!name) return;
    try {
      const rec = await apiCreateProject({
        name: name.trim() || 'New project',
        sizeId,
        data: { inputs },
      });
      await reloadProjects(rec.id);
    } catch (e) {
      toast.error(`Save failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function saveOver() {
    if (!selectedProject) return;
    try {
      await apiUpdateProject(selectedProject.id, { sizeId, data: { inputs } });
      await reloadProjects(selectedProject.id);
      toast.success('Project saved');
    } catch (e) {
      toast.error(`Save failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function dupProject() {
    if (!selectedProject) return;
    try {
      const rec = await apiCreateProject({
        name: `${selectedProject.name} copy`,
        sizeId,
        data: { inputs: selectedProject.inputs },
      });
      await reloadProjects(rec.id);
    } catch (e) {
      toast.error(`Duplicate failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function renameProject(newName: string) {
    if (!selectedProject) return;
    try {
      await apiUpdateProject(selectedProject.id, { name: newName });
      await reloadProjects(selectedProject.id);
    } catch (e) {
      toast.error(`Rename failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function delProject() {
    if (!selectedProject) return;
    try {
      await apiDeleteProject(selectedProject.id);
      const items = await apiListProjects();
      const list = items.map(adaptProject);
      setProjects(list);
      const next = list[0];
      setSelectedProjectId(next?.id ?? null);
      if (next) setInputs({ ...DEFAULT_INPUTS, ...next.inputs });
    } catch (e) {
      toast.error(`Delete failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ── Text-template CRUD via backend ──────────────────────────────────────
  async function reloadTextTemplates(selectId?: string | null) {
    const items = await apiListTextTemplates();
    const list = items.map(adaptTextTemplate).filter((x): x is TextTemplateStripItem => x !== null);
    setTextTemplates(list);
    if (selectId !== undefined) setSelectedTextTemplateId(selectId);
  }

  async function createNewTextTemplate() {
    const name = prompt(t('iePromptTemplateName'), t('iePromptNewTemplate'));
    if (!name) return;
    try {
      const rec = await apiCreateTextTemplate({
        label: name.trim() || 'New template',
        styles: {
          badgeStyle: inputs.badgeStyle,
          subtitleStyle: inputs.subtitleStyle,
          titleStyle: inputs.titleStyle,
          bodyStyle: inputs.bodyStyle,
        },
      });
      await reloadTextTemplates(rec.id);
    } catch (e) {
      toast.error(`Save failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function saveOverTextTemplate() {
    if (!selectedTextTemplate) return;
    try {
      await apiUpdateTextTemplate(selectedTextTemplate.id, {
        styles: {
          badgeStyle: inputs.badgeStyle,
          subtitleStyle: inputs.subtitleStyle,
          titleStyle: inputs.titleStyle,
          bodyStyle: inputs.bodyStyle,
        },
      });
      await reloadTextTemplates(selectedTextTemplate.id);
    } catch (e) {
      toast.error(`Save failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function dupTextTemplate() {
    if (!selectedTextTemplate) return;
    try {
      const rec = await apiCreateTextTemplate({
        label: `${selectedTextTemplate.name} copy`,
        styles: {
          badgeStyle: selectedTextTemplate.badgeStyle,
          subtitleStyle: selectedTextTemplate.subtitleStyle,
          titleStyle: selectedTextTemplate.titleStyle,
          bodyStyle: selectedTextTemplate.bodyStyle,
        },
      });
      await reloadTextTemplates(rec.id);
    } catch (e) {
      toast.error(`Duplicate failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function renameTextTemplate(newName: string) {
    if (!selectedTextTemplate) return;
    try {
      await apiUpdateTextTemplate(selectedTextTemplate.id, { label: newName });
      await reloadTextTemplates(selectedTextTemplate.id);
    } catch (e) {
      toast.error(`Rename failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function delTextTemplate() {
    if (!selectedTextTemplate) return;
    try {
      await apiDeleteTextTemplate(selectedTextTemplate.id);
      await reloadTextTemplates(null);
    } catch (e) {
      toast.error(`Delete failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ── Export / render ──────────────────────────────────────────────────────
  async function exportCurrent(format: 'png' | 'jpeg') {
    setExporting(true);
    setExportError(null);
    try {
      const result = await renderBanner({
        sizeId,
        inputs,
        format,
        quality: format === 'jpeg' ? 90 : 100,
      });
      // Download the file
      const url = resolveMediaUrl(result.url);
      const a = document.createElement('a');
      a.href = url;
      const ext = format === 'jpeg' ? 'jpg' : 'png';
      const safe = (inputs.title || 'banner').replace(/[\\/:*?"<>|]/g, '_').slice(0, 40);
      a.download = `${safe}_${size.id}_${size.width}x${size.height}.${ext}`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(`Rendered in ${result.durationMs}ms`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setExportError(msg);
      toast.error(`Render failed: ${msg}`);
    } finally {
      setExporting(false);
    }
  }

  async function exportToLibrary() {
    setExporting(true);
    setExportError(null);
    try {
      const result = await renderBanner({
        sizeId,
        inputs,
        format: 'png',
        quality: 100,
        saveToLibrary: true,
        folder: 'Banners',
      });
      const absUrl = resolveMediaUrl(result.url);
      setLastRenderedUrl(absUrl);
      toast.success(`Saved to Library (${result.durationMs}ms)`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setExportError(msg);
      toast.error(`Save failed: ${msg}`);
    } finally {
      setExporting(false);
    }
  }

  function handleUsePending() {
    if (!pending || !lastRenderedUrl) return;
    completePending(lastRenderedUrl);
    toast.success(`Sent to ${pending.contextLabel}`);
  }

  function handleCancelPending() {
    cancelPending();
  }

  // ── Picker handlers ──────────────────────────────────────────────────────
  function openBgPicker() {
    setPickerTarget('bg');
    setPickerOpen(true);
  }
  function openLogoPicker() {
    setPickerTarget('logo');
    setPickerOpen(true);
  }
  function handlePicked(item: PickedMedia) {
    const url = resolveMediaUrl(item.url);
    if (pickerTarget === 'bg') patchBgImage(url);
    else if (pickerTarget === 'logo') patchLogoUrl(url);
    setPickerOpen(false);
    setPickerTarget(null);
  }

  // ── Preview sizing ───────────────────────────────────────────────────────
  const previewMaxW = 720;
  const previewMaxH = 720;
  const fitScale = Math.min(previewMaxW / size.width, previewMaxH / size.height);
  const displayW = Math.round(size.width * fitScale);
  const displayH = Math.round(size.height * fitScale);

  const isBgVideo = (() => {
    const url = (inputs.backgroundImageUrl ?? '').split('?')[0].toLowerCase();
    return /\.(mp4|webm|mov|m4v|ogv)$/.test(url);
  })();

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    // The page is light-themed; wrap in white so it sits cleanly inside the dark app shell.
    <div style={s.app}>
      {pending && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 16px',
            background: '#dbeafe',
            borderBottom: '1px solid #93c5fd',
            color: '#1e3a8a',
            fontSize: 13,
          }}
        >
          <span style={{ flex: 1 }}>
            ✏️ Editing for <strong>{pending.contextLabel}</strong>. Render below, then click
            “Use this image” to send the result back.
          </span>
          {!lastRenderedUrl ? (
            <button
              onClick={() => exportToLibrary()}
              disabled={exporting}
              style={{
                padding: '6px 14px',
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                fontWeight: 600,
                cursor: 'pointer',
                opacity: exporting ? 0.5 : 1,
              }}
            >
              {exporting ? 'Rendering…' : '🎨 Render & save to library'}
            </button>
          ) : (
            <button
              onClick={handleUsePending}
              style={{
                padding: '6px 14px',
                background: '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ✅ Use this image
            </button>
          )}
          <button
            onClick={handleCancelPending}
            style={{
              padding: '6px 10px',
              background: 'transparent',
              color: '#1e3a8a',
              border: '1px solid #93c5fd',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      )}
      <header style={s.header}>
        <h1 style={s.h1}>{t('iePageTitle')}</h1>
        <span style={s.subtitle}>{t('ieSubtitle')}</span>
        <div style={s.headerRight}>
          <select
            value={sizeId}
            onChange={(e) => setSizeId(e.target.value)}
            style={s.sizeSelect}
          >
            {BANNER_SIZES.map((sz) => (
              <option key={sz.id} value={sz.id}>
                {sz.label} ({sz.width}×{sz.height})
              </option>
            ))}
          </select>
          {selectedProject && (
            <span style={s.currentTpl}>
              <strong>{selectedProject.name}</strong>
              {hasUnsavedChanges && <span style={s.dirty}> *</span>}
            </span>
          )}
          <div style={s.exportGroup}>
            <button
              onClick={() => exportCurrent('png')}
              disabled={exporting}
              style={{ ...s.exportBtn, ...s.exportPrimary, ...(exporting ? s.btnBusy : {}) }}
              title={`${t('ieRenderPng')} — ${size.label}`}
            >
              {exporting ? 'Rendering…' : 'PNG'}
            </button>
            <button
              onClick={() => exportCurrent('jpeg')}
              disabled={exporting}
              style={{ ...s.exportBtn, ...(exporting ? s.btnBusy : {}) }}
              title={`${t('ieRenderJpeg')} — ${size.label}`}
            >
              JPEG
            </button>
            <button
              onClick={exportToLibrary}
              disabled={exporting}
              style={{ ...s.exportBtn, ...(exporting ? s.btnBusy : {}) }}
              title={t('ieRenderToLibrary')}
            >
              Save to Library
            </button>
          </div>
          <button onClick={() => setFontsOpen(true)} style={s.gearBtn} title={t('ieCustomFonts')}>
            🔤 Fonts
          </button>
        </div>
      </header>

      {exportError && (
        <div style={s.exportError}>
          ⚠ Render error: {exportError}
        </div>
      )}

      {/* ── Top ribbon: projects / themes / text templates ── */}
      <div style={s.ribbon}>
        <ProjectStrip
          projects={projects}
          selectedId={selectedProjectId}
          onSelect={selectProject}
          onCreateNew={createNewProject}
          onSaveOver={saveOver}
          onDuplicate={dupProject}
          onRename={renameProject}
          onDelete={delProject}
          hasUnsavedChanges={hasUnsavedChanges}
        />
        <ColorThemeStrip
          themes={colorThemes}
          selectedId={selectedColorThemeId}
          onSelect={applyColorTheme}
        />
        <TextTemplateStrip
          templates={textTemplates}
          selectedId={selectedTextTemplateId}
          onSelect={applyTextTemplate}
          onCreateNew={createNewTextTemplate}
          onSaveOver={saveOverTextTemplate}
          onDuplicate={dupTextTemplate}
          onRename={renameTextTemplate}
          onDelete={delTextTemplate}
          hasUnsavedChanges={textTemplateHasUnsavedChanges}
          baseInputs={inputs}
          size={size}
        />
      </div>

      {/* ── Background & logo settings (collapsible) ── */}
      <div style={s.bgLogoBand}>
        <div style={s.bgLogoBandPadding}>
          <button
            onClick={() => setBgLogoOpen((v) => !v)}
            style={{
              ...s.bgLogoActionBtn,
              ...(bgLogoOpen ? s.bgLogoActionBtnOpen : s.bgLogoActionBtnClosed),
            }}
          >
            <span style={s.bgLogoActionTextWrap}>
              <span style={s.bgLogoActionTextMain}>
                {bgLogoOpen ? '▼ Close background / logo' : 'Background image / Logo'}
              </span>
              {!bgLogoOpen && (
                <span style={s.bgLogoActionTextSub}>
                  Pick background, set position, opacity, logo
                </span>
              )}
            </span>
            {!bgLogoOpen && (
              <span style={s.bgLogoActionStatus}>
                <span
                  style={{
                    ...s.bgLogoStatusChip,
                    ...(inputs.backgroundImageUrl ? s.bgLogoStatusChipOn : s.bgLogoStatusChipOff),
                  }}
                >
                  🖼 Background {inputs.backgroundImageUrl ? 'set' : 'none'}
                </span>
                <span
                  style={{
                    ...s.bgLogoStatusChip,
                    ...(inputs.logoUrl ? s.bgLogoStatusChipOn : s.bgLogoStatusChipOff),
                  }}
                >
                  🏷 Logo {inputs.logoUrl ? 'set' : 'none'}
                </span>
              </span>
            )}
          </button>
        </div>
        {bgLogoOpen && (
          <div style={s.bgLogoBandGrid}>
            <div style={s.bgLogoCol}>
              <div style={{ ...s.bgLogoColHeader, ...s.bgLogoColHeaderBg }}>🖼 Background</div>
              <Section title={`🖼 ${t('ieBackgroundImage')}`}>
                <div style={s.row}>
                  <span style={s.fieldLabel}>{t('ieImageUrl')}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="text"
                      value={inputs.backgroundImageUrl ?? ''}
                      onChange={(e) => patchBgImage(e.target.value)}
                      placeholder={t('ieImageUrlPlaceholder')}
                      style={{ ...s.input, flex: 1 }}
                    />
                    <button onClick={openBgPicker} style={s.searchBtn} title={t('iePickMedia')}>
                      🔍 Pick
                    </button>
                    {inputs.backgroundImageUrl && (
                      <button onClick={() => patchBgImage('')} style={s.clearBtn}>
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                <SliderRow
                  label="Opacity"
                  min={0}
                  max={1}
                  step={0.05}
                  value={inputs.backgroundImageOpacity ?? 1}
                  onChange={patchBgImageOpacity}
                  formatValue={(v) => `${Math.round(v * 100)}%`}
                  disabled={!inputs.backgroundImageUrl}
                />
                <SliderRow
                  label="Scale"
                  min={0.5}
                  max={3}
                  step={0.05}
                  value={inputs.backgroundImageScale ?? 1}
                  onChange={patchBgImageScale}
                  formatValue={(v) => `${Math.round(v * 100)}%`}
                  disabled={!inputs.backgroundImageUrl}
                  onReset={() => patchBgImageScale(1)}
                />
                <SliderRow
                  label="Offset X"
                  min={-500}
                  max={500}
                  step={10}
                  value={inputs.backgroundImageOffsetX ?? 0}
                  onChange={patchBgImageOffsetX}
                  formatValue={(v) => `${v > 0 ? '+' : ''}${v}`}
                  disabled={!inputs.backgroundImageUrl}
                  onReset={() => patchBgImageOffsetX(0)}
                />
                <SliderRow
                  label="Offset Y"
                  min={-500}
                  max={500}
                  step={10}
                  value={inputs.backgroundImageOffsetY ?? 0}
                  onChange={patchBgImageOffsetY}
                  formatValue={(v) => `${v > 0 ? '+' : ''}${v}`}
                  disabled={!inputs.backgroundImageUrl}
                  onReset={() => patchBgImageOffsetY(0)}
                />
                {isBgVideo && (
                  <div style={{ ...s.row, fontSize: 11, color: '#6b7280' }}>
                    Video backgrounds preview but will be rendered as a still frame on export. Video timeline editing isn't available in this build.
                  </div>
                )}
              </Section>
            </div>

            <div style={s.bgLogoCol}>
              <div style={{ ...s.bgLogoColHeader, ...s.bgLogoColHeaderLogo }}>🏷 Logo</div>
              <Section title={`🏷 ${t('ieLogo')}`}>
                <div style={s.row}>
                  <span style={s.fieldLabel}>{t('ieImageUrl')}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="text"
                      value={inputs.logoUrl ?? ''}
                      onChange={(e) => patchLogoUrl(e.target.value)}
                      placeholder={t('ieImageUrlPlaceholder')}
                      style={{ ...s.input, flex: 1 }}
                    />
                    <button onClick={openLogoPicker} style={s.searchBtn} title={t('iePickMedia')}>
                      🔍 Pick
                    </button>
                    {inputs.logoUrl && (
                      <button onClick={() => patchLogoUrl('')} style={s.clearBtn}>
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                <div style={s.row}>
                  <span style={s.fieldLabel}>
                    Position
                    {inputs.logoPosition === 'custom' && (
                      <span style={{ marginLeft: 6, color: '#3b82f6', fontWeight: 700 }}>
                        (custom: {inputs.logoX ?? 0}, {inputs.logoY ?? 0})
                      </span>
                    )}
                  </span>
                  <div style={s.posGrid}>
                    {([
                      ['top-left', '↖'], ['top-center', '↑'], ['top-right', '↗'],
                      ['middle-left', '←'], ['center', '●'], ['middle-right', '→'],
                      ['bottom-left', '↙'], ['bottom-center', '↓'], ['bottom-right', '↘'],
                    ] as const).map(([pos, icon]) => (
                      <button
                        key={pos}
                        onClick={() => patchLogoPosition(pos)}
                        style={{
                          ...s.posCell,
                          ...(inputs.logoPosition === pos ? s.posCellActive : {}),
                        }}
                        title={pos}
                        disabled={!inputs.logoUrl}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                  <span style={s.hint}>
                    💡 Drag the logo on the preview for free placement.
                  </span>
                </div>
                <SliderRow
                  label="Size"
                  min={40}
                  max={400}
                  step={10}
                  value={inputs.logoSize ?? 120}
                  onChange={patchLogoSize}
                  formatValue={(v) => `${v}px`}
                  disabled={!inputs.logoUrl}
                />
                <SliderRow
                  label="Margin"
                  min={0}
                  max={200}
                  step={5}
                  value={inputs.logoMargin ?? 40}
                  onChange={patchLogoMargin}
                  formatValue={(v) => `${v}px`}
                  disabled={!inputs.logoUrl}
                />
                <SliderRow
                  label="Opacity"
                  min={0}
                  max={1}
                  step={0.05}
                  value={inputs.logoOpacity ?? 1}
                  onChange={patchLogoOpacity}
                  formatValue={(v) => `${Math.round(v * 100)}%`}
                  disabled={!inputs.logoUrl}
                />
              </Section>
            </div>
          </div>
        )}
      </div>

      {/* ── Main: preview + right panel ── */}
      <div style={s.main}>
        <main style={s.previewCol}>
          <div style={s.previewMeta}>
            {size.label} — {size.width}×{size.height} (display {displayW}×{displayH})
            {inputs.logoUrl && (
              <span style={{ marginLeft: 8, color: '#3b82f6' }}>
                ✋ Drag the logo to reposition
              </span>
            )}
          </div>
          <div
            style={{
              ...s.playerWrap,
              width: displayW,
              height: displayH,
              position: 'relative',
            }}
          >
            <div
              style={{
                width: size.width,
                height: size.height,
                transform: `scale(${fitScale})`,
                transformOrigin: 'top left',
              }}
            >
              <Player
                template={template as never}
                controls={isBgVideo}
                autoplay={isBgVideo}
                loop={isBgVideo}
                style={{ width: size.width, height: size.height }}
                renderLayer={renderLayerWithEffects as never}
              />
            </div>
            <DraggableLogoOverlay
              inputs={inputs}
              bannerWidth={size.width}
              bannerHeight={size.height}
              displayWidth={displayW}
              displayHeight={displayH}
              onPatch={(p) => setInputs((prev) => ({ ...prev, ...p }))}
            />
          </div>
        </main>

        <aside style={s.rightPanel}>
          <Section title={`📝 ${t('ieTextStyling')}`}>
            {TEXT_FIELDS.map((f) => {
              const style = inputs[f.styleKey];
              const hidden = f.hideKey ? !!inputs[f.hideKey] : false;
              const colorValue = style.color || inputs.textColor || '#ffffff';
              return (
                <div key={f.textKey} style={{ ...s.row, ...(hidden ? s.rowHidden : {}) }}>
                  <div style={s.rowHead}>
                    <span>{f.label}</span>
                    <div style={s.toolRow}>
                      <input
                        type="color"
                        value={colorValue}
                        onChange={(e) => patchStyle(f.styleKey, { ...style, color: e.target.value })}
                        style={s.inlineColor}
                        title={t('ieTextColor')}
                        disabled={hidden}
                      />
                      {style.color && (
                        <button
                          onClick={() => patchStyle(f.styleKey, { ...style, color: '' })}
                          style={s.inlineResetBtn}
                          title={t('ieResetThemeColor')}
                          disabled={hidden}
                        >
                          ⟲
                        </button>
                      )}
                      <FontPicker
                        value={style}
                        onChange={(next) => patchStyle(f.styleKey, next)}
                      />
                      {f.hideKey && (
                        <ToggleHideButton
                          hideKey={f.hideKey}
                          inputs={inputs}
                          setInputs={setInputs}
                        />
                      )}
                    </div>
                  </div>
                  {f.multiline ? (
                    <textarea
                      value={inputs[f.textKey] ?? ''}
                      onChange={(e) => patchText(f.textKey, e.target.value)}
                      rows={2}
                      style={s.textarea}
                      disabled={hidden}
                    />
                  ) : (
                    <input
                      type="text"
                      value={inputs[f.textKey] ?? ''}
                      onChange={(e) => patchText(f.textKey, e.target.value)}
                      style={s.input}
                      disabled={hidden}
                    />
                  )}
                  {!hidden && (
                    <TextStyleControls
                      value={style}
                      onChange={(next) => patchStyle(f.styleKey, next)}
                    />
                  )}
                </div>
              );
            })}
          </Section>

          <Section title={`📐 ${t('ieLayout')}`}>
            <div style={s.row}>
              <span style={s.fieldLabel}>{t('ieVerticalPosition')}</span>
              <div style={s.btnGroup}>
                {VERTICAL_LAYOUTS.map((v) => (
                  <button
                    key={v.value}
                    onClick={() => patchVertical(v.value)}
                    style={{
                      ...s.groupBtn,
                      ...(inputs.verticalLayout === v.value ? s.groupBtnActive : {}),
                    }}
                  >
                    {v.icon} {v.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={s.row}>
              <span style={s.fieldLabel}>{t('ieWritingDirection')}</span>
              <div style={s.btnGroup}>
                {WRITING_MODES.map((w) => (
                  <button
                    key={w.value}
                    onClick={() => patchWriting(w.value)}
                    style={{
                      ...s.groupBtn,
                      ...(inputs.writingMode === w.value ? s.groupBtnActive : {}),
                    }}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          <Section title={`🎨 ${t('ieOverrideColors')}`}>
            <div style={s.colorGrid}>
              {(['backgroundColor', 'textColor', 'badgeColor'] as const).map((k) => (
                <label key={k} style={s.colorLabel}>
                  <span>
                    {k === 'backgroundColor' ? 'Bg' : k === 'textColor' ? 'Text' : 'Badge'}
                  </span>
                  <input
                    type="color"
                    value={inputs[k] ?? '#000000'}
                    onChange={(e) => patchColor(k, e.target.value)}
                    style={s.color}
                  />
                </label>
              ))}
            </div>
          </Section>

          <div style={s.bottomActions}>
            <button onClick={createNewTextTemplate} style={s.saveTplBtn} title={t('ieSaveTextTemplate')}>
              💾 Save text template
            </button>
            <button onClick={() => setInputs({ ...DEFAULT_INPUTS })} style={s.reset}>
              ⟲ Defaults
            </button>
          </div>
        </aside>
      </div>

      <MediaPickerModal
        open={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setPickerTarget(null);
        }}
        onPick={handlePicked}
        title={pickerTarget === 'logo' ? t('iePickLogo') : t('iePickBackground')}
        contextSubtitle={inputs.title || undefined}
        imagesOnly={pickerTarget === 'logo'}
      />

      <FontsModal open={fontsOpen} onClose={() => setFontsOpen(false)} onChanged={() => refreshCustomFonts()} />
    </div>
  );
}

// ───── Subcomponents ────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={s.section}>
      <div style={s.sectionTitle}>{title}</div>
      <div style={s.sectionBody}>{children}</div>
    </section>
  );
}

function SliderRow({
  label,
  min,
  max,
  step,
  value,
  onChange,
  formatValue,
  disabled,
  onReset,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  formatValue: (v: number) => string;
  disabled?: boolean;
  onReset?: () => void;
}) {
  return (
    <div style={s.row}>
      <div style={s.sliderRow}>
        <span style={s.fieldLabel}>{label}</span>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={s.slider}
          disabled={disabled}
        />
        <span style={s.sliderValue}>{formatValue(value)}</span>
        {onReset && (
          <button
            onClick={onReset}
            style={s.inlineResetBtn}
            title="Reset"
            disabled={disabled}
          >
            ⟲
          </button>
        )}
      </div>
    </div>
  );
}

// We extract the toggle into its own component so that updates fire through
// React's state (avoiding the closure over `f.hideKey` causing a stale set).
function ToggleHideButton({
  hideKey,
  inputs,
  setInputs,
}: {
  hideKey: HideKey;
  inputs: Required<BannerInputs>;
  setInputs: React.Dispatch<React.SetStateAction<Required<BannerInputs>>>;
}) {
  const { t } = useLanguage();
  const hidden = !!inputs[hideKey];
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <button
      ref={ref}
      onClick={() => setInputs((prev) => ({ ...prev, [hideKey]: !prev[hideKey] }))}
      style={{
        ...s.eyeBtn,
        ...(hidden ? s.eyeBtnHidden : {}),
      }}
      title={hidden ? t('ieHidden') : t('ieClickToHide')}
    >
      {hidden ? '🚫' : '👁'}
    </button>
  );
}

// Force the page background to white so it sits cleanly in the dark app shell.
const s: Record<string, React.CSSProperties> = {
  app: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    background: '#fff',
    color: '#0f172a',
    overflow: 'hidden',
  },
  header: {
    height: 48,
    padding: '0 16px',
    background: '#fff',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flex: '0 0 auto',
  },
  h1: { fontSize: 15, fontWeight: 700, margin: 0 },
  subtitle: { fontSize: 11, color: '#6b7280' },
  headerRight: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 },
  sizeSelect: {
    height: 28,
    padding: '0 8px',
    border: '1px solid #d1d5db',
    borderRadius: 4,
    fontSize: 12,
    fontFamily: 'inherit',
  },
  currentTpl: { fontSize: 12, color: '#374151' },
  dirty: { color: '#dc2626', fontWeight: 700 },

  ribbon: { flex: '0 0 auto', display: 'flex', flexDirection: 'column' },

  bgLogoBand: {
    flex: '0 0 auto',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    background: '#f9fafb',
  },
  bgLogoBandPadding: {
    padding: '10px 16px',
    display: 'flex',
  },
  bgLogoActionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '10px 18px',
    minHeight: 60,
    width: '100%',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'inherit',
    borderRadius: 10,
    transition: 'background 0.15s, box-shadow 0.15s, transform 0.05s',
  },
  bgLogoActionBtnClosed: {
    background: '#fff',
    border: '2px solid #6366f1',
    color: '#1e1b4b',
    boxShadow: '0 2px 0 #4338ca, 0 4px 14px rgba(99, 102, 241, 0.25)',
  },
  bgLogoActionBtnOpen: {
    background: '#eef2ff',
    border: '2px solid #c7d2fe',
    color: '#3730a3',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
  },
  bgLogoActionTextWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    flex: '1 1 auto',
    minWidth: 0,
  },
  bgLogoActionTextMain: {
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: '0.01em',
  },
  bgLogoActionTextSub: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: 500,
  },
  bgLogoActionStatus: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  bgLogoStatusChip: {
    fontSize: 11,
    padding: '3px 10px',
    borderRadius: 999,
    fontWeight: 700,
  },
  bgLogoStatusChipOff: {
    background: '#f3f4f6',
    border: '1px solid #d1d5db',
    color: '#9ca3af',
  },
  bgLogoStatusChipOn: {
    background: '#dcfce7',
    border: '1px solid #86efac',
    color: '#166534',
  },
  bgLogoBandGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    gap: 0,
    alignItems: 'start',
    borderTop: '1px solid #e5e7eb',
    background: '#fff',
  },
  bgLogoCol: {
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid #e5e7eb',
  },
  bgLogoColHeader: {
    fontSize: 12,
    fontWeight: 700,
    padding: '6px 12px',
    letterSpacing: '0.04em',
    borderBottom: '1px solid #e5e7eb',
  },
  bgLogoColHeaderBg: { background: '#eff6ff', color: '#1d4ed8' },
  bgLogoColHeaderLogo: { background: '#fef3c7', color: '#92400e' },

  main: { flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 },
  previewCol: {
    flex: 1,
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    overflow: 'auto',
    background: '#f3f4f6',
  },
  previewMeta: { fontSize: 12, color: '#6b7280' },
  playerWrap: {
    background: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
  },

  rightPanel: {
    width: 360,
    padding: 12,
    borderLeft: '1px solid #e5e7eb',
    background: '#fff',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  section: {
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    background: '#fff',
  },
  sectionTitle: {
    padding: '8px 12px',
    fontSize: 11,
    fontWeight: 700,
    color: '#374151',
    background: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    borderRadius: '6px 6px 0 0',
    letterSpacing: '0.02em',
  },
  sectionBody: {
    padding: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  row: { display: 'flex', flexDirection: 'column', gap: 4 },
  rowHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 12,
    color: '#374151',
    gap: 6,
  },
  rowHidden: { opacity: 0.55 },
  toolRow: { display: 'inline-flex', alignItems: 'center', gap: 4 },
  inlineColor: {
    width: 26,
    height: 22,
    padding: 0,
    border: '1px solid #d1d5db',
    borderRadius: 3,
    cursor: 'pointer',
  },
  inlineResetBtn: {
    width: 18,
    height: 22,
    padding: 0,
    border: '1px solid #d1d5db',
    background: '#fff',
    borderRadius: 3,
    cursor: 'pointer',
    fontSize: 10,
    color: '#6b7280',
    fontFamily: 'inherit',
  },
  eyeBtn: {
    width: 26,
    height: 22,
    padding: 0,
    border: '1px solid #d1d5db',
    background: '#fff',
    borderRadius: 3,
    cursor: 'pointer',
    fontSize: 11,
    fontFamily: 'inherit',
  },
  eyeBtnHidden: {
    background: '#fee2e2',
    borderColor: '#fca5a5',
  },
  fieldLabel: { fontSize: 11, color: '#6b7280', marginBottom: 2 },
  input: {
    height: 30,
    padding: '0 8px',
    border: '1px solid #d1d5db',
    borderRadius: 4,
    fontSize: 12,
    fontFamily: 'inherit',
  },
  textarea: {
    padding: '6px 8px',
    border: '1px solid #d1d5db',
    borderRadius: 4,
    fontSize: 12,
    fontFamily: 'inherit',
    resize: 'vertical',
    minHeight: 50,
  },
  btnGroup: { display: 'flex', gap: 4 },
  groupBtn: {
    flex: 1,
    height: 28,
    padding: '0 6px',
    border: '1px solid #d1d5db',
    background: '#fff',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 11,
    fontFamily: 'inherit',
    color: '#374151',
  },
  groupBtnActive: { background: '#3b82f6', color: '#fff', borderColor: '#3b82f6', fontWeight: 600 },

  sliderRow: { display: 'flex', alignItems: 'center', gap: 8 },
  slider: { flex: 1 },
  sliderValue: {
    fontSize: 11,
    color: '#374151',
    fontFamily: 'monospace',
    minWidth: 38,
    textAlign: 'right',
  },
  hint: { fontSize: 10, color: '#9ca3af', marginTop: 4 },

  colorGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 },
  colorLabel: { display: 'flex', flexDirection: 'column', gap: 2, fontSize: 11, color: '#6b7280' },
  color: { height: 28, width: '100%', padding: 0, border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer' },

  bottomActions: { display: 'flex', gap: 6 },
  saveTplBtn: {
    flex: 1,
    height: 32,
    padding: '0 12px',
    border: '1px solid #3b82f6',
    background: '#3b82f6',
    color: '#fff',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'inherit',
  },
  reset: {
    height: 32,
    padding: '0 12px',
    border: '1px solid #d1d5db',
    background: '#f9fafb',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 12,
    fontFamily: 'inherit',
  },
  searchBtn: {
    height: 30,
    padding: '0 10px',
    border: '1px solid #3b82f6',
    background: '#3b82f6',
    color: '#fff',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 600,
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  },
  exportGroup: {
    display: 'inline-flex',
    gap: 4,
    alignItems: 'center',
  },
  exportBtn: {
    height: 32,
    padding: '0 10px',
    border: '1px solid #d1d5db',
    background: '#fff',
    color: '#374151',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  },
  exportPrimary: {
    border: '1px solid #16a34a',
    background: '#16a34a',
    color: '#fff',
  },
  btnBusy: { opacity: 0.6, cursor: 'wait' },
  exportError: {
    flex: '0 0 auto',
    padding: '8px 16px',
    background: '#fee2e2',
    color: '#991b1b',
    fontSize: 12,
    borderBottom: '1px solid #fca5a5',
  },
  gearBtn: {
    height: 32,
    padding: '0 12px',
    border: '1px solid #d1d5db',
    background: '#fff',
    color: '#374151',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 12,
    fontFamily: 'inherit',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontWeight: 500,
  },
  clearBtn: {
    width: 30,
    height: 30,
    padding: 0,
    border: '1px solid #fca5a5',
    background: '#fff',
    color: '#b91c1c',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 12,
    fontFamily: 'inherit',
  },
  posGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 4,
    width: 120,
  },
  posCell: {
    height: 28,
    border: '1px solid #d1d5db',
    background: '#fff',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 14,
    fontFamily: 'inherit',
    color: '#6b7280',
  },
  posCellActive: {
    background: '#3b82f6',
    color: '#fff',
    borderColor: '#3b82f6',
    fontWeight: 700,
  },
};
