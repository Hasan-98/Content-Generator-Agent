import { useState, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import type { ArticleSection } from '../../types';
import { IMEInput, IMETextarea } from '../common/IMEInput';

interface Props {
  section: ArticleSection;
  onRegenerate: (index: number, instruction?: string) => Promise<void>;
  onContentChange: (index: number, content: string) => void;
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

const TYPE_LABEL: Record<string, string> = {
  intro:   'イントロ',
  nayami:  '悩み',
  point:   'ポイント',
  common:  '誤解',
  cta:     'CTA',
  matome:  'まとめ',
};

export default function SectionCard({ section, onRegenerate, onContentChange, onHeadingChange, onRegenerateHeading }: Props) {
  const { t } = useLanguage();
  const [collapsed, setCollapsed] = useState(false);
  const [showInstruction, setShowInstruction] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [loading, setLoading] = useState(false);
  const [headingLoading, setHeadingLoading] = useState(false);
  const [editingHeading, setEditingHeading] = useState(false);
  const [headingDraft, setHeadingDraft] = useState(section.heading);
  const inputRef = useRef<HTMLInputElement>(null);

  const color = TYPE_COLOR[section.type] ?? '#8b949e';
  const typeLabel = TYPE_LABEL[section.type] ?? section.type;

  async function handleRegen(withInstruction?: boolean) {
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
    <div className="rounded-lg border border-bd bg-bg1 overflow-hidden mb-3">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 cursor-pointer hover:bg-bg2 transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: `${color}22`, color }}>
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
            className="flex-1 text-sm text-t1 font-medium bg-bg0 border border-aB rounded px-2 py-0.5 focus:outline-none"
          />
        ) : (
          <span
            className="text-sm text-t1 font-medium flex-1 truncate cursor-text hover:text-aB transition-colors"
            onClick={startEditingHeading}
            title={t('sectionHeadingClickToEdit')}
          >
            {section.heading}
          </span>
        )}

        {/* Regenerate heading button */}
        <button
          onClick={(e) => { e.stopPropagation(); handleHeadingRegen(); }}
          disabled={headingLoading}
          className="p-1 rounded hover:bg-bg2 text-tM hover:text-aP disabled:opacity-50 transition-colors"
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

        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`w-4 h-4 text-tM transition-transform ${collapsed ? '-rotate-90' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {!collapsed && (
        <div className="px-4 pb-4 border-t border-bd/50">
          {/* Content textarea */}
          <IMETextarea
            value={section.content}
            onValueChange={(val) => onContentChange(section.index, val)}
            rows={4}
            className="w-full mt-3 bg-bg0 border border-bd rounded-lg px-3 py-2 text-xs text-t1 resize-none focus:outline-none focus:border-aB transition-colors"
            style={{ minHeight: 80 }}
          />

          {/* Actions */}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => handleRegen(false)}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded border border-aP/50 text-aP hover:bg-aP/10 disabled:opacity-50 transition-colors"
            >
              {loading ? '再生成中…' : t('sectionRegenBtn')}
            </button>
            <button
              onClick={() => setShowInstruction(!showInstruction)}
              className="text-xs px-3 py-1.5 rounded border border-bd text-t2 hover:border-t2 hover:text-t1 transition-colors"
            >
              {t('sectionRegenWithInstruction')}
            </button>
          </div>

          {showInstruction && (
            <div className="mt-2 flex gap-2">
              <IMEInput
                value={instruction}
                onValueChange={setInstruction}
                placeholder={t('sectionInstructionPlaceholder')}
                className="flex-1 bg-bg0 border border-bd rounded px-2 py-1.5 text-xs text-t1 focus:outline-none focus:border-aB"
                onKeyDown={(e) => { if (e.key === 'Enter') handleRegen(true); }}
              />
              <button
                onClick={() => handleRegen(true)}
                disabled={loading || !instruction.trim()}
                className="text-xs px-3 py-1.5 rounded bg-aP/20 text-aP hover:bg-aP/30 disabled:opacity-50 transition-colors"
              >
                実行
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
