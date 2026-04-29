import { useState, useRef, useCallback, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import type { ArticleSection } from '../../types';
import { IMEInput, IMETextarea } from '../common/IMEInput';

interface Props {
  section: ArticleSection;
  onRegenerate: (index: number, instruction?: string) => Promise<void>;
  onContentChange: (index: number, content: string) => Promise<void>;
  onHeadingChange: (index: number, heading: string) => void;
  onRegenerateHeading: (index: number) => Promise<void>;
}

const TYPE_COLOR: Record<string, string> = {
  intro:   '#58a6ff',
  nayami:  '#d29922',
  point:   '#bc8cff',
  common:  '#39d2c0',
  cta:     '#3fb950',
  matome:  '#f778ba',
};

const TYPE_LABEL_KEY: Record<string, string> = {
  intro:   'sectionTypeIntro',
  nayami:  'sectionTypeNayami',
  point:   'sectionTypePoint',
  common:  'sectionTypeCommon',
  cta:     'sectionTypeCta',
  matome:  'sectionTypeMatome',
};

export default function SectionCard({ section, onRegenerate, onContentChange, onHeadingChange, onRegenerateHeading }: Props) {
  const { t } = useLanguage();
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showInstruction, setShowInstruction] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [loading, setLoading] = useState(false);
  const [headingLoading, setHeadingLoading] = useState(false);
  const [editingHeading, setEditingHeading] = useState(false);
  const [headingDraft, setHeadingDraft] = useState(section.heading);
  const inputRef = useRef<HTMLInputElement>(null);

  // Save state tracking
  const [localContent, setLocalContent] = useState(section.content);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
  const contentDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local content when section prop changes externally (regen, etc.)
  useEffect(() => {
    setLocalContent(section.content);
    setSaveStatus('saved');
  }, [section.content]);

  const debouncedContentChange = useCallback((val: string) => {
    if (contentDebounceRef.current) clearTimeout(contentDebounceRef.current);
    setSaveStatus('unsaved');
    contentDebounceRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await onContentChange(section.index, val);
        setSaveStatus('saved');
      } catch {
        setSaveStatus('unsaved');
      }
    }, 600);
  }, [onContentChange, section.index]);

  async function handleManualSave() {
    if (saveStatus !== 'unsaved') return;
    if (contentDebounceRef.current) {
      clearTimeout(contentDebounceRef.current);
      contentDebounceRef.current = null;
    }
    setSaveStatus('saving');
    try {
      await onContentChange(section.index, localContent);
      setSaveStatus('saved');
    } catch {
      setSaveStatus('unsaved');
    }
  }

  const color = TYPE_COLOR[section.type] ?? '#8b949e';
  const typeLabelKey = TYPE_LABEL_KEY[section.type];
  const typeLabel = typeLabelKey ? t(typeLabelKey as any) : section.type;

  async function handleRegen(withInstruction?: boolean) {
    if (loading) return;
    setLoading(true);
    try {
      await onRegenerate(section.index, withInstruction ? instruction : undefined);
      if (withInstruction) { setInstruction(''); setShowInstruction(false); }
    } finally {
      setLoading(false);
    }
  }

  async function handleHeadingRegen() {
    setHeadingLoading(true);
    try {
      await onRegenerateHeading(section.index);
    } finally {
      setHeadingLoading(false);
    }
  }

  function startEditingHeading(e: React.MouseEvent) {
    e.stopPropagation();
    setHeadingDraft(section.heading);
    setEditingHeading(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function commitHeading() {
    setEditingHeading(false);
    const trimmed = headingDraft.trim();
    if (trimmed && trimmed !== section.heading) {
      onHeadingChange(section.index, trimmed);
    }
  }

  return (
    <div className={`bg-bg0 border rounded-lg overflow-hidden mb-3 transition-all ${
      collapsed ? 'border-bd' : 'border-aB/40 shadow-[0_0_0_1px_rgba(88,166,255,0.05)]'
    }`}>
      {/* Header — matches Topic keyword card header style */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-2 cursor-pointer hover:bg-bg2 transition-colors group"
        onClick={() => setCollapsed(!collapsed)}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`w-4 h-4 text-tM shrink-0 transition-transform ${collapsed ? '-rotate-90' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>

        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0" style={{ background: `${color}22`, color }}>
          {typeLabel}
        </span>

        {editingHeading ? (
          <IMEInput
            ref={inputRef}
            value={headingDraft}
            onValueChange={setHeadingDraft}
            onBlur={commitHeading}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitHeading();
              if (e.key === 'Escape') { setEditingHeading(false); setHeadingDraft(section.heading); }
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 text-xs text-t1 font-medium bg-bg1 border border-aB rounded px-2 py-0.5 focus:outline-none"
          />
        ) : (
          <span
            className="flex-1 text-xs font-medium text-t1 truncate cursor-text hover:text-aB transition-colors"
            onClick={startEditingHeading}
            title={t('sectionHeadingClickToEdit')}
          >
            {section.heading}
          </span>
        )}

        {/* Save status badge */}
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full shrink-0 ${
          saveStatus === 'saved' ? 'bg-aG/15 text-aG' :
          saveStatus === 'saving' ? 'bg-aO/15 text-aO' :
          'bg-aR/15 text-aR'
        }`}>
          {saveStatus === 'saved' ? t('sectionSaved') :
           saveStatus === 'saving' ? t('sectionSaving') :
           t('sectionUnsaved')}
        </span>

        {/* Regenerate heading button */}
        <button
          onClick={(e) => { e.stopPropagation(); handleHeadingRegen(); }}
          disabled={headingLoading}
          className="hidden group-hover:flex w-5 h-5 items-center justify-center rounded text-tM hover:bg-aP/15 hover:text-aP disabled:opacity-50 transition-colors border-0 bg-transparent"
          title={t('sectionHeadingRegenBtn')}
        >
          {headingLoading ? (
            <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4m-3.93 7.07l-2.83-2.83M6.34 6.34L3.51 3.51" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 4v6h6M23 20v-6h-6" />
              <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
            </svg>
          )}
        </button>
      </div>

      {/* Expandable body — matches Topic keyword card body style */}
      {!collapsed && (
        <div className="px-2.5 pb-2.5 space-y-2">
          {/* Content field with label */}
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-tM text-[10px] font-mono uppercase tracking-wider">
              {t('sectionContentLabel') || 'CONTENT'}
              <span className="text-[8px] px-1 rounded bg-aB/15 text-aB normal-case tracking-normal">
                {localContent.length.toLocaleString()} 文字
              </span>
            </label>
            <IMETextarea
              value={localContent}
              onValueChange={(val) => {
                setLocalContent(val);
                debouncedContentChange(val);
              }}
              rows={expanded ? undefined : 4}
              className="w-full bg-bg1 border border-bd rounded px-2 py-1.5 text-t1 text-xs focus:outline-none focus:border-aB transition-colors leading-relaxed"
              style={{ minHeight: expanded ? 200 : 80, height: expanded ? 'auto' : undefined, resize: expanded ? 'vertical' : 'none' }}
            />
            <div className="flex justify-end">
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-[10px] text-tM hover:text-aB transition-colors"
              >
                {expanded ? t('sectionCollapseBtn') : t('sectionExpandBtn')}
              </button>
            </div>
          </div>

          {/* Action buttons — gradient primary button like Topic generate */}
          <div className="flex gap-1.5">
            <button
              onClick={() => handleRegen(false)}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-semibold text-white bg-gradient-to-r from-aB to-aP hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(88,166,255,0.3)] active:translate-y-0"
            >
              {loading ? (
                <><span className="animate-spin inline-block">⟳</span> {t('detailRegenerating')}</>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path d="M1 4v6h6M23 20v-6h-6" />
                    <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
                  </svg>
                  {t('sectionRegenBtn')}
                </>
              )}
            </button>
            {/* Save button */}
            <button
              onClick={handleManualSave}
              disabled={saveStatus !== 'unsaved'}
              className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                saveStatus === 'unsaved'
                  ? 'text-aG bg-aG/10 hover:bg-aG/20 border border-aG/30'
                  : 'text-tM bg-bg2 border border-bd opacity-50 cursor-default'
              }`}
            >
              {t('sectionSaveBtn')}
            </button>
          </div>

          {/* Instruction regen — secondary button like Topic view results */}
          <button
            onClick={() => setShowInstruction(!showInstruction)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] text-t1 bg-bg2 border border-bd hover:bg-bg2 transition-colors cursor-pointer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            {t('sectionRegenWithInstruction')}
          </button>

          {showInstruction && (
            <div className="space-y-1">
              <label className="block text-tM text-[10px] font-mono uppercase tracking-wider">
                {t('sectionInstructionPlaceholder')}
              </label>
              <div className="flex gap-1.5">
                <IMEInput
                  value={instruction}
                  onValueChange={setInstruction}
                  placeholder={t('sectionInstructionPlaceholder')}
                  className="flex-1 bg-bg1 border border-bd rounded px-2 py-1.5 text-xs text-t1 focus:outline-none focus:border-aB transition-colors"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !loading) handleRegen(true); }}
                />
                <button
                  onClick={() => handleRegen(true)}
                  disabled={loading || !instruction.trim()}
                  className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-white bg-gradient-to-r from-aP to-aB hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
                >
                  実行
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
