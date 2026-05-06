import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import {
  searchPhotos as searchPhotosApi,
  searchVideos as searchVideosApi,
  generateImage as generateImageApi,
  listLibrary as listLibraryApi,
  uploadLibrary as uploadLibraryApi,
  importFromUrl as importFromUrlApi,
  resolveMediaUrl,
  type MediaPhoto,
  type MediaVideo,
  type MediaLibraryItem,
  type AiImageModel,
  type PhotoProvider,
  type ReferenceImage,
} from '../../api/media';
import {
  listPromptPresets,
  composePrompt,
  getDefaultPresetId,
  setDefaultPresetId,
  type PromptPreset,
} from '../../lib/promptPresets';

// ───── Public types ─────────────────────────────────────────────

export type MediaPickerTab = 'library' | 'photo' | 'video' | 'ai-image';

/** Minimal shape callers care about — abstracts away photo/video/AI/library origin. */
export interface PickedMedia {
  /** Public-resolvable URL (https or /uploads/...) */
  url: string;
  /** Optional: the ID if it's stored in the user's library (lets caller link directly) */
  libraryId?: string;
  /** "image" or "video" */
  kind: 'image' | 'video';
  /** Where it came from — useful for credit lines and audit */
  source: 'library' | 'pexels' | 'unsplash' | 'ai' | 'upload';
  /** Display-only metadata */
  width?: number;
  height?: number;
  durationSec?: number;
  photographer?: string;
  photographerUrl?: string;
  sourceUrl?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (item: PickedMedia) => void;
  /** Restrict tabs (e.g. ['photo', 'ai-image'] for the avatar flow). Defaults to all. */
  enabledTabs?: MediaPickerTab[];
  /** Initial tab. Defaults to first of enabledTabs. */
  initialTab?: MediaPickerTab;
  /** Show only images in library (hides videos). For avatar flow. */
  imagesOnly?: boolean;
  /** Optional context line under the title (e.g. section heading). */
  contextSubtitle?: string;
  /** Title text. Defaults to "Pick media". */
  title?: string;
  /**
   * If provided, an "Open in editor" affordance is shown on each pickable
   * image (and as a global header button when nothing is picked yet). The
   * caller is responsible for routing the user to the Image Editor and
   * wiring the round-trip via `imageEditorBridge`.
   */
  onOpenInEditor?: (picked: PickedMedia | null) => void;
}

const ALL_TABS: Array<{ id: MediaPickerTab; label: string; icon: string }> = [
  { id: 'library', label: 'Library', icon: '📁' },
  { id: 'photo', label: 'Photo search', icon: '📷' },
  { id: 'video', label: 'Video search', icon: '🎬' },
  { id: 'ai-image', label: 'AI generate', icon: '✨' },
];

const AI_MODELS: Array<{ value: AiImageModel; label: string; provider: string; hint: string }> = [
  { value: 'kie-nano-banana-pro', label: 'Kie nano-banana-pro', provider: 'Kie.ai', hint: 'Default — fast Gemini 2.5 Flash backed model. Aspect ratios 1:1 / 16:9.' },
  { value: 'kie-nano-banana', label: 'Kie nano-banana', provider: 'Kie.ai', hint: 'Cheaper variant + image-edit when reference images are attached.' },
  { value: 'openai-gpt-image-2', label: 'OpenAI gpt-image-2', provider: 'OpenAI', hint: 'Latest OpenAI model — strong text rendering, high cost.' },
  { value: 'openai-gpt-image-1', label: 'OpenAI gpt-image-1', provider: 'OpenAI', hint: 'Previous OpenAI model — cheaper, good for simple prompts.' },
];

const SIZE_OPTIONS_OPENAI: Array<{ value: string; label: string }> = [
  { value: '1024x1024', label: '1024×1024 (square)' },
  { value: '1536x1024', label: '1536×1024 (landscape)' },
  { value: '1024x1536', label: '1024×1536 (portrait)' },
];
const SIZE_OPTIONS_KIE: Array<{ value: string; label: string }> = [
  { value: '1:1', label: '1:1 (square)' },
  { value: '16:9', label: '16:9 (landscape)' },
];

const MAX_REF_IMAGES = 4;

// ───── Component ────────────────────────────────────────────────

export default function MediaPickerModal({
  open,
  onClose,
  onPick,
  enabledTabs,
  initialTab,
  imagesOnly,
  contextSubtitle,
  title,
  onOpenInEditor,
}: Props) {
  const tabs = ALL_TABS.filter((t) => !enabledTabs || enabledTabs.includes(t.id));
  const [tab, setTab] = useState<MediaPickerTab>(initialTab ?? tabs[0]?.id ?? 'photo');

  function pickAndOpenEditor(p: PickedMedia | null) {
    if (!onOpenInEditor) return;
    onOpenInEditor(p);
    onClose();
  }

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-bg0/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-bg1 border border-bd rounded-lg w-full max-w-4xl shadow-xl flex flex-col"
        style={{ height: 'min(86vh, 760px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3 border-b border-bd flex items-center justify-between shrink-0">
          <div>
            <div className="text-sm text-t1 font-semibold">{title ?? 'Pick media'}</div>
            {contextSubtitle && <div className="text-[11px] text-tM mt-0.5">{contextSubtitle}</div>}
          </div>
          <div className="flex items-center gap-2">
            {onOpenInEditor && (
              <button
                onClick={() => pickAndOpenEditor(null)}
                className="text-[11px] px-3 py-1 rounded bg-aP/15 text-aP border border-aP/40 hover:bg-aP/25"
                title="Open the banner editor with a blank canvas"
              >
                ✏️ Open in editor
              </button>
            )}
            <button onClick={onClose} className="text-tM hover:text-t1 text-lg leading-none">&times;</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 border-b border-bd shrink-0">
          {tabs.map((t) => {
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`text-xs px-3 py-2 border-b-2 transition-colors ${
                  active
                    ? 'border-aB text-aB font-semibold'
                    : 'border-transparent text-t2 hover:text-t1'
                }`}
              >
                <span className="mr-1.5">{t.icon}</span>
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {tab === 'library' && <LibraryTab imagesOnly={imagesOnly} onPick={(p) => { onPick(p); onClose(); }} />}
          {tab === 'photo' && <PhotoSearchTab onPick={(p) => { onPick(p); onClose(); }} />}
          {tab === 'video' && <VideoSearchTab onPick={(p) => { onPick(p); onClose(); }} />}
          {tab === 'ai-image' && <AiImageTab onPick={(p) => { onPick(p); onClose(); }} />}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ───── Library tab ──────────────────────────────────────────────

function LibraryTab({ imagesOnly, onPick }: { imagesOnly?: boolean; onPick: (p: PickedMedia) => void }) {
  const [folder, setFolder] = useState<string>('');
  const [items, setItems] = useState<MediaLibraryItem[]>([]);
  const [folders, setFolders] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await listLibraryApi(folder);
      const resolved = r.items.map((i) => ({ ...i, url: resolveMediaUrl(i.url) }));
      setItems(imagesOnly ? resolved.filter((i) => i.kind === 'IMAGE') : resolved);
      setFolders(r.folders);
    } catch {
      toast.error('Failed to load library');
    } finally {
      setLoading(false);
    }
  }, [folder, imagesOnly]);

  useEffect(() => { void load(); }, [load]);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      await uploadLibraryApi(file, folder);
      await load();
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-1 min-h-0">
      <aside className="w-44 border-r border-bd p-3 overflow-y-auto shrink-0">
        <div className="text-[10px] text-tM uppercase mb-2">Folders</div>
        <button
          onClick={() => setFolder('')}
          className={`w-full text-left text-xs px-2 py-1 rounded mb-0.5 ${
            folder === '' ? 'bg-aB/15 text-aB' : 'text-t2 hover:bg-bg2'
          }`}
        >
          All
        </button>
        {folders.map((f) => (
          <button
            key={f.name || '(root)'}
            onClick={() => setFolder(f.name)}
            className={`w-full text-left text-xs px-2 py-1 rounded mb-0.5 truncate ${
              folder === f.name ? 'bg-aB/15 text-aB' : 'text-t2 hover:bg-bg2'
            }`}
          >
            {f.name || '(root)'} <span className="text-tM">{f.count}</span>
          </button>
        ))}

        <label
          className={`block mt-3 text-xs text-center px-3 py-2 rounded border border-dashed border-bd hover:border-aB hover:text-aB transition-colors cursor-pointer ${
            uploading ? 'opacity-50 pointer-events-none' : 'text-t2'
          }`}
        >
          {uploading ? 'Uploading…' : '+ Upload'}
          <input
            type="file"
            accept={imagesOnly ? 'image/*' : 'image/*,video/*'}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              e.target.value = '';
            }}
            className="hidden"
          />
        </label>
      </aside>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center text-tM text-sm py-12">Loading…</div>
        ) : items.length === 0 ? (
          <EmptyState title="Nothing here yet" sub="Upload a file or pick from search / AI to fill the library." />
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
            {items.map((it) => (
              <button
                key={it.id}
                onClick={() => onPick({
                  url: it.url,
                  libraryId: it.id,
                  kind: it.kind === 'VIDEO' ? 'video' : 'image',
                  source: 'library',
                  width: it.width ?? undefined,
                  height: it.height ?? undefined,
                  durationSec: it.durationSec ?? undefined,
                })}
                className="group rounded-lg border border-bd hover:border-aB overflow-hidden text-left transition-colors"
                title={it.originalName}
              >
                <div className="aspect-video bg-bg0 relative">
                  {it.kind === 'VIDEO' ? (
                    <video src={it.url} className="w-full h-full object-cover" preload="metadata" muted />
                  ) : (
                    <img src={it.url} alt={it.originalName} className="w-full h-full object-cover" loading="lazy" />
                  )}
                  <span className="absolute top-1.5 left-1.5 text-[9px] px-1.5 py-0.5 rounded bg-bg0/80 text-t2">
                    {it.kind === 'VIDEO' ? 'Video' : 'Image'}
                  </span>
                </div>
                <div className="px-2 py-1 text-[10px] text-t2 truncate">{it.originalName}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ───── Photo search tab ────────────────────────────────────────

function PhotoSearchTab({ onPick }: { onPick: (p: PickedMedia) => void }) {
  const [provider, setProvider] = useState<PhotoProvider>('pexels');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<MediaPhoto[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function doSearch(p: number) {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const r = await searchPhotosApi({ q: query.trim(), provider, page: p });
      setItems(r.items);
      setPage(r.page);
      setSearched(true);
    } catch (e) {
      setError(toErrorMessage(e));
      setItems([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 p-4 gap-3">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && doSearch(1)}
          placeholder={`Search ${provider} photos (e.g. cafe, sunset, mountain)`}
          className="flex-1 bg-bg0 border border-bd rounded px-3 py-1.5 text-sm text-t1 focus:outline-none focus:border-aB"
          autoFocus
        />
        <button
          onClick={() => doSearch(1)}
          disabled={loading || !query.trim()}
          className="px-4 py-1.5 text-xs bg-aB/20 text-aB border border-aB/40 rounded hover:bg-aB/30 disabled:opacity-50 transition-colors font-medium"
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[11px] text-tM">Provider:</span>
        {(['pexels', 'unsplash'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setProvider(p)}
            className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
              provider === p
                ? 'bg-aB/15 text-aB border-aB/40'
                : 'text-t2 border-bd hover:text-t1'
            }`}
          >
            {p === 'pexels' ? 'Pexels' : 'Unsplash'}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {error && <div className="text-xs text-aR bg-aR/10 border border-aR/20 rounded px-3 py-2 mb-2">{error}</div>}
        {!error && !searched && (
          <EmptyState title="Type a keyword and search" sub="Try cafe, sunset, mountain, abstract…" />
        )}
        {!error && searched && items.length === 0 && (
          <EmptyState title="No results" sub="Try a different keyword." />
        )}
        {items.length > 0 && (
          <>
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
              {items.map((it) => (
                <button
                  key={`${it.provider}_${it.id}`}
                  onClick={() => onPick({
                    url: it.fullUrl,
                    kind: 'image',
                    source: it.provider,
                    width: it.width,
                    height: it.height,
                    photographer: it.photographer,
                    photographerUrl: it.photographerUrl,
                    sourceUrl: it.sourceUrl,
                  })}
                  className="group rounded-lg border border-bd hover:border-aB overflow-hidden bg-bg0 relative"
                  title={`${it.photographer ?? ''} (${it.provider})`}
                >
                  <div className="aspect-[4/3]">
                    <img src={it.thumbUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  {it.photographer && (
                    <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent text-white text-[9px] px-2 py-1 truncate">
                      📷 {it.photographer}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <Pager page={page} loading={loading} onPage={(p) => doSearch(p)} />
          </>
        )}
      </div>
    </div>
  );
}

// ───── Video search tab ────────────────────────────────────────

function VideoSearchTab({ onPick }: { onPick: (p: PickedMedia) => void }) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<MediaVideo[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function doSearch(p: number) {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const r = await searchVideosApi({ q: query.trim(), page: p });
      setItems(r.items);
      setPage(r.page);
      setSearched(true);
    } catch (e) {
      setError(toErrorMessage(e));
      setItems([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 p-4 gap-3">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && doSearch(1)}
          placeholder="Search Pexels videos (e.g. ocean, city, drone)"
          className="flex-1 bg-bg0 border border-bd rounded px-3 py-1.5 text-sm text-t1 focus:outline-none focus:border-aB"
          autoFocus
        />
        <button
          onClick={() => doSearch(1)}
          disabled={loading || !query.trim()}
          className="px-4 py-1.5 text-xs bg-aB/20 text-aB border border-aB/40 rounded hover:bg-aB/30 disabled:opacity-50 transition-colors font-medium"
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>
      <div className="text-[11px] text-tM">Provider: Pexels Videos (uses your Pexels key)</div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {error && <div className="text-xs text-aR bg-aR/10 border border-aR/20 rounded px-3 py-2 mb-2">{error}</div>}
        {!error && !searched && <EmptyState title="Type a keyword" sub="Try ocean, neon, drone, nature…" />}
        {!error && searched && items.length === 0 && <EmptyState title="No results" sub="Try a different keyword." />}
        {items.length > 0 && (
          <>
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              {items.map((it) => (
                <div key={it.id} className="rounded-lg border border-bd bg-bg0 overflow-hidden">
                  <video src={it.videoUrl} poster={it.thumbUrl} controls preload="metadata" className="w-full aspect-video bg-black" />
                  <div className="flex items-center justify-between px-2 py-1.5 gap-2">
                    <span className="text-[10px] text-t2 truncate flex-1">
                      🎬 {it.photographer ?? 'unknown'}
                      {it.durationSec ? ` · ${it.durationSec}s` : ''}
                    </span>
                    <button
                      onClick={() => onPick({
                        url: it.videoUrl,
                        kind: 'video',
                        source: 'pexels',
                        width: it.width,
                        height: it.height,
                        durationSec: it.durationSec,
                        photographer: it.photographer,
                        photographerUrl: it.photographerUrl,
                        sourceUrl: it.sourceUrl,
                      })}
                      className="text-[10px] px-2 py-1 rounded bg-aB/20 text-aB border border-aB/40 hover:bg-aB/30 font-medium"
                    >
                      Use
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Pager page={page} loading={loading} onPage={(p) => doSearch(p)} />
          </>
        )}
      </div>
    </div>
  );
}

// ───── AI Image tab ────────────────────────────────────────────

function AiImageTab({ onPick }: { onPick: (p: PickedMedia) => void }) {
  const [model, setModel] = useState<AiImageModel>('kie-nano-banana-pro');
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<string>('1:1');
  const [presets, setPresets] = useState<PromptPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [defaultId, setDefaultId] = useState<string | null>(null);
  const [refImages, setRefImages] = useState<Array<{ id: string; src: string; filename: string }>>([]);
  const [dragOver, setDragOver] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Array<{ url: string; libraryId: string | null }>>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Initial preset load
  useEffect(() => {
    const list = listPromptPresets('image');
    setPresets(list);
    const def = getDefaultPresetId('image');
    setDefaultId(def);
    if (def && list.find((p) => p.id === def)) setSelectedPresetId(def);
    else if (list[0]) setSelectedPresetId(list[0].id);
  }, []);

  // Reset size when switching model family.
  useEffect(() => {
    if (model.startsWith('openai-')) {
      if (!SIZE_OPTIONS_OPENAI.find((o) => o.value === size)) setSize('1024x1024');
    } else {
      if (!SIZE_OPTIONS_KIE.find((o) => o.value === size)) setSize('1:1');
    }
  }, [model, size]);

  const selectedPreset = presets.find((p) => p.id === selectedPresetId) || null;
  const composed = composePrompt(prompt, selectedPreset);
  const sizeOptions = model.startsWith('openai-') ? SIZE_OPTIONS_OPENAI : SIZE_OPTIONS_KIE;

  async function handleAddFiles(list: FileList | File[]) {
    const arr = Array.from(list).slice(0, MAX_REF_IMAGES - refImages.length);
    for (const file of arr) {
      if (!file.type.startsWith('image/')) continue;
      const dataUrl = await readAsDataURL(file);
      setRefImages((prev) => [
        ...prev,
        { id: `ref_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, src: dataUrl, filename: file.name },
      ].slice(0, MAX_REF_IMAGES));
    }
  }

  async function handleGenerate() {
    if (!composed.trim()) return;
    setGenerating(true);
    setError(null);
    setResults([]);
    try {
      const refs: ReferenceImage[] = refImages.map((r) => ({ src: r.src }));
      const r = await generateImageApi({
        model,
        prompt: composed,
        size,
        n: 1,
        referenceImages: refs.length > 0 ? refs : undefined,
        saveToLibrary: true,
      });
      const saved = r.saved ?? [];
      const list = saved.length > 0
        ? saved.map((s) => ({ url: resolveMediaUrl(s.url), libraryId: s.libraryId }))
        : r.results.map((res) => ({ url: res.url, libraryId: null }));
      setResults(list);
    } catch (e) {
      setError(toErrorMessage(e));
    } finally {
      setGenerating(false);
    }
  }

  function toggleDefault(id: string) {
    if (defaultId === id) {
      setDefaultPresetId(null, 'image');
      setDefaultId(null);
    } else {
      setDefaultPresetId(id, 'image');
      setDefaultId(id);
    }
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-3">
      {/* Model picker */}
      <div>
        <div className="text-[11px] text-t2 font-semibold mb-1.5">Model</div>
        <div className="grid grid-cols-2 gap-2">
          {AI_MODELS.map((m) => (
            <button
              key={m.value}
              onClick={() => setModel(m.value)}
              className={`text-left p-2 rounded border transition-colors ${
                model === m.value ? 'border-aB bg-aB/10' : 'border-bd hover:border-aB/50'
              }`}
              title={m.hint}
            >
              <div className="text-xs text-t1 font-semibold">{m.label}</div>
              <div className="text-[10px] text-tM mt-0.5">{m.hint}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Style preset chips */}
      <div>
        <div className="text-[11px] text-t2 font-semibold mb-1.5">Style preset</div>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => {
            const sel = p.id === selectedPresetId;
            const def = p.id === defaultId;
            return (
              <div key={p.id} className={`flex items-center rounded-full border ${sel ? 'border-aB bg-aB/10' : 'border-bd'}`}>
                <button
                  onClick={() => setSelectedPresetId(p.id)}
                  className={`text-[11px] px-2 py-0.5 ${sel ? 'text-aB font-semibold' : 'text-t2 hover:text-t1'}`}
                  title={p.styleSuffix}
                >
                  {p.label}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleDefault(p.id); }}
                  className={`text-[11px] px-1 ${def ? 'text-aO' : 'text-tM hover:text-t1'}`}
                  title={def ? 'Default — click to clear' : 'Set as default'}
                >
                  {def ? '★' : '☆'}
                </button>
              </div>
            );
          })}
          <button
            onClick={() => setSelectedPresetId(null)}
            className={`text-[11px] px-2 py-0.5 rounded-full border ${
              selectedPresetId === null ? 'border-aB bg-aB/10 text-aB font-semibold' : 'border-bd text-t2 hover:text-t1'
            }`}
          >
            None
          </button>
        </div>
      </div>

      {/* Prompt + size */}
      <div className="flex gap-2 items-stretch">
        <div className="flex-1">
          <div className="text-[11px] text-t2 font-semibold mb-1.5">Prompt</div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="e.g. A cozy modern kitchen with morning light streaming in"
            className="w-full bg-bg0 border border-bd rounded px-2 py-1.5 text-xs text-t1 focus:outline-none focus:border-aB resize-none"
          />
          {selectedPreset && composed !== prompt.trim() && (
            <div className="mt-1 text-[10px] text-tM">
              Final: <span className="text-t2">{composed}</span>
            </div>
          )}
        </div>
        <div className="w-40 shrink-0">
          <div className="text-[11px] text-t2 font-semibold mb-1.5">Size</div>
          <select
            value={size}
            onChange={(e) => setSize(e.target.value)}
            className="w-full bg-bg0 border border-bd rounded px-2 py-1.5 text-xs text-t1 focus:outline-none focus:border-aB"
          >
            {sizeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Reference image DnD */}
      <div>
        <div className="text-[11px] text-t2 font-semibold mb-1.5">
          Reference images <span className="text-tM font-normal">(optional, up to {MAX_REF_IMAGES} — enables image-edit)</span>
        </div>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files) handleAddFiles(e.dataTransfer.files);
          }}
          className={`rounded border-2 border-dashed transition-colors p-2 ${
            dragOver ? 'border-aB bg-aB/5' : 'border-bd'
          }`}
        >
          {refImages.length === 0 ? (
            <div className="text-center py-4 text-xs text-tM">
              📥 Drag & drop reference images here, or{' '}
              <button onClick={() => fileRef.current?.click()} className="text-aB hover:underline">
                choose files
              </button>
            </div>
          ) : (
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' }}>
              {refImages.map((r) => (
                <div key={r.id} className="relative aspect-square rounded overflow-hidden border border-bd">
                  <img src={r.src} alt={r.filename} className="w-full h-full object-cover" />
                  <button
                    onClick={() => setRefImages((prev) => prev.filter((x) => x.id !== r.id))}
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-bg0/80 text-aR hover:bg-aR/20 text-[11px]"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {refImages.length < MAX_REF_IMAGES && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="aspect-square rounded border border-dashed border-bd text-tM hover:border-aB hover:text-aB text-xs"
                >
                  + Add
                </button>
              )}
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              if (e.target.files) handleAddFiles(e.target.files);
              e.target.value = '';
            }}
            className="hidden"
          />
        </div>
      </div>

      {/* Generate button */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleGenerate}
          disabled={!prompt.trim() || generating}
          className="px-4 py-2 text-xs rounded bg-aP/20 text-aP border border-aP/40 hover:bg-aP/30 disabled:opacity-50 transition-colors font-medium"
        >
          {generating ? '✨ Generating… (10–60s)' : '✨ Generate'}
        </button>
        {error && <div className="text-xs text-aR">{error}</div>}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div>
          <div className="text-[11px] text-t2 font-semibold mb-1.5">
            Results — click to use
          </div>
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => onPick({
                  url: r.url,
                  libraryId: r.libraryId ?? undefined,
                  kind: 'image',
                  source: 'ai',
                })}
                className="rounded border border-bd hover:border-aP overflow-hidden bg-bg0"
              >
                <img src={r.url} alt={`generated ${i + 1}`} className="w-full aspect-square object-cover" />
              </button>
            ))}
          </div>
          <div className="text-[10px] text-tM mt-2">
            💡 Generated images are auto-saved to library &gt; <strong>AI Generated</strong> folder.
          </div>
        </div>
      )}
    </div>
  );
}

// ───── Shared bits ────────────────────────────────────────────

function EmptyState({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
      <div className="text-sm text-t2 mb-1">{title}</div>
      {sub && <div className="text-[11px] text-tM">{sub}</div>}
    </div>
  );
}

function Pager({ page, loading, onPage }: { page: number; loading: boolean; onPage: (p: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-3 py-3 border-t border-bd mt-3">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page <= 1 || loading}
        className="text-xs px-3 py-1 rounded border border-bd text-t2 hover:text-t1 disabled:opacity-40"
      >
        ‹ Prev
      </button>
      <span className="text-[11px] text-tM">page {page}</span>
      <button
        onClick={() => onPage(page + 1)}
        disabled={loading}
        className="text-xs px-3 py-1 rounded border border-bd text-t2 hover:text-t1 disabled:opacity-40"
      >
        Next ›
      </button>
    </div>
  );
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function toErrorMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'response' in e) {
    const resp = (e as { response?: { data?: { error?: string } } }).response;
    if (resp?.data?.error) return resp.data.error;
  }
  return e instanceof Error ? e.message : String(e);
}

// Convenience helper for callers that want to import a remote URL straight into library.
export async function importPickedToLibrary(p: PickedMedia, folder?: string): Promise<MediaLibraryItem | null> {
  if (p.libraryId) return null; // already there
  if (p.url.startsWith('/uploads/')) return null;
  try {
    return await importFromUrlApi(p.url, folder, p.photographer || `pick-${Date.now()}`);
  } catch {
    return null;
  }
}
