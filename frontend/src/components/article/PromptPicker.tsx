import { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import {
  listPromptTemplates,
  getBasePrompt,
} from '../../api/promptTemplates';
import type { PromptTemplate } from '../../api/promptTemplates';

interface Props {
  selectedId: string;
  onSelect: (id: string) => void;
  onManage: () => void;
  refreshKey?: number; // bump to refetch after a save in the manage modal
}

/**
 * Card-based prompt template picker.
 *
 * Always shows the base prompt as a read-only card so users can see what
 * their custom instructions are added on top of, plus a "Default (no extras)"
 * card and one card per saved template.
 */
export default function PromptPicker({ selectedId, onSelect, onManage, refreshKey }: Props) {
  const { t } = useLanguage();
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [basePrompt, setBasePrompt] = useState<string>('');
  const [showBase, setShowBase] = useState(false);
  const [expandedTplId, setExpandedTplId] = useState<string | null>(null);

  useEffect(() => {
    listPromptTemplates().then(setTemplates).catch(() => { /* silent */ });
    getBasePrompt().then(({ content }) => setBasePrompt(content)).catch(() => { /* silent */ });
  }, [refreshKey]);

  return (
    <div className="w-full space-y-2.5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-tM text-[10px] font-mono uppercase tracking-wider">
          {t('promptTplPickLabel')}
        </span>
        <button
          onClick={onManage}
          className="text-[10px] px-2 py-0.5 rounded border border-bd text-t2 hover:border-aB/50 hover:text-aB transition-colors"
        >
          {t('promptTplManage')}
        </button>
      </div>

      {/* Base prompt — read-only, expandable */}
      <div className="rounded-lg border border-aP/30 bg-aP/5 overflow-hidden">
        <button
          onClick={() => setShowBase(!showBase)}
          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-aP/10 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-aP shrink-0">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span className="flex-1 text-[11px] font-semibold text-aP">{t('promptTplBaseTitle')}</span>
          <span className="text-[9px] text-aP/70 uppercase tracking-wider">{t('promptTplBaseReadonly')}</span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`w-3.5 h-3.5 text-aP/70 transition-transform ${showBase ? '' : '-rotate-90'}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {showBase && (
          <div className="px-3 pb-3 pt-1 max-h-64 overflow-y-auto">
            <pre className="text-[10px] text-t2 leading-relaxed whitespace-pre-wrap font-mono">{basePrompt || t('appLoading')}</pre>
          </div>
        )}
      </div>

      {/* Picker grid: "Default (no extras)" + each template */}
      <div className="grid grid-cols-2 gap-2">
        {/* Default = no template */}
        <PickerCard
          selected={selectedId === ''}
          onClick={() => onSelect('')}
          title={t('promptTplPickNone')}
          subtitle={t('promptTplPickNoneDesc')}
          accent="aB"
        />
        {templates.map((tpl) => (
          <PickerCard
            key={tpl.id}
            selected={selectedId === tpl.id}
            onClick={() => onSelect(tpl.id)}
            title={tpl.name}
            subtitle={tpl.content}
            isDefault={tpl.isDefault}
            expanded={expandedTplId === tpl.id}
            onToggleExpand={() => setExpandedTplId(expandedTplId === tpl.id ? null : tpl.id)}
            accent="aG"
          />
        ))}
      </div>

      {templates.length === 0 && (
        <p className="text-[10px] text-tM text-center py-1">{t('promptTplEmptyHint')}</p>
      )}
    </div>
  );
}

interface CardProps {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  isDefault?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  accent: 'aB' | 'aG';
}

function PickerCard({ selected, onClick, title, subtitle, isDefault, expanded, onToggleExpand, accent }: CardProps) {
  const accentClasses = accent === 'aB'
    ? 'border-aB/40 ring-2 ring-aB/30 bg-aB/5'
    : 'border-aG/40 ring-2 ring-aG/30 bg-aG/5';

  return (
    <div
      onClick={onClick}
      className={`relative rounded-lg border-2 p-2.5 cursor-pointer transition-all ${
        selected
          ? accentClasses
          : 'border-bd bg-bg0 hover:border-aB/30 hover:bg-bg2'
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Radio indicator */}
        <div className={`mt-0.5 w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center ${
          selected ? `border-${accent}` : 'border-bd'
        }`}>
          {selected && <div className={`w-1.5 h-1.5 rounded-full bg-${accent}`} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-t1 truncate flex-1">{title}</span>
            {isDefault && (
              <span className="text-[8px] px-1 py-0.5 rounded-full bg-aG/15 text-aG font-medium uppercase tracking-wider shrink-0">
                ★
              </span>
            )}
          </div>
          <p className={`text-[10px] text-tM mt-1 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
            {subtitle}
          </p>
          {onToggleExpand && subtitle.length > 80 && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
              className="text-[10px] text-aB hover:underline mt-1"
            >
              {expanded ? '▲' : '▼'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
