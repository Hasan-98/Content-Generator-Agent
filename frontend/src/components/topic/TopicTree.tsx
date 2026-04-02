import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { TopLevel, Keyword } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { IMEInput, IMETextarea } from '../common/IMEInput';
import WpConfigModal from '../user/WpConfigModal';
import ShopifyConfigModal from '../user/ShopifyConfigModal';

interface Props {
  topLevels: TopLevel[];
  selectedKeywordId: string | null;
  onSelectKeyword: (topLevelId: string, keywordId: string) => void;
  onRenameTopLevel: (id: string, name: string) => void;
  onDeleteTopLevel: (id: string) => void;
  onAddTopLevel: (name: string) => void;
  onAddKeyword: (topLevelId: string) => void;
  onDeleteKeyword: (id: string) => void;
  onUpdateKeyword: (id: string, data: { keyword?: string; goal?: string; audience?: string }) => void;
  onGenerate: (keywordId: string) => void;
  onCancelGenerate: () => void;
  generatingId: string | null;
}

export default function TopicTree({
  topLevels,
  selectedKeywordId,
  onSelectKeyword,
  onRenameTopLevel,
  onDeleteTopLevel,
  onAddTopLevel,
  onAddKeyword,
  onDeleteKeyword,
  onUpdateKeyword,
  onGenerate,
  onCancelGenerate,
  generatingId,
}: Props) {
  const { t } = useLanguage();
  const [collapsedTL, setCollapsedTL] = useState<Set<string>>(new Set());
  const [collapsedKW, setCollapsedKW] = useState<Set<string>>(new Set());
  const [editingTL, setEditingTL] = useState<string | null>(null);
  const [editTLName, setEditTLName] = useState('');
  const [wpConfigTopic, setWpConfigTopic] = useState<{ id: string; name: string } | null>(null);
  const [shopifyConfigTopic, setShopifyConfigTopic] = useState<{ id: string; name: string } | null>(null);

  function toggleTL(id: string) {
    setCollapsedTL((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function collapseAll() {
    setCollapsedTL(new Set(topLevels.map((tl) => tl.id)));
    setCollapsedKW(new Set(topLevels.flatMap((tl) => tl.keywords.map((k) => k.id))));
  }

  function toggleKW(id: string) {
    setCollapsedKW((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function startEditTL(tl: TopLevel) {
    setEditingTL(tl.id);
    setEditTLName(tl.name);
  }

  function commitEditTL(id: string) {
    if (editTLName.trim()) onRenameTopLevel(id, editTLName.trim());
    setEditingTL(null);
  }

  function handleEditKeyDown(e: KeyboardEvent, id: string) {
    if (e.key === 'Enter') commitEditTL(id);
    if (e.key === 'Escape') setEditingTL(null);
  }

  const totalResults = (tl: TopLevel) => tl.keywords.reduce((a, k) => a + k.results.length, 0);

  return (
    <div className="w-80 bg-bg1 border-r border-bd flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-bd">
        <span className="text-t2 text-[11px] font-semibold uppercase tracking-widest">{t('treeHeader')}</span>
        <div className="flex gap-1">
          <button
            onClick={collapseAll}
            title={t('treeCollapseAll')}
            className="w-6 h-6 flex items-center justify-center rounded text-tM hover:bg-bg2 hover:text-t1 transition-colors border-0 bg-transparent"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[17px] h-[17px]">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          <button
            onClick={() => onAddTopLevel(t('topicNewProject'))}
            title={t('treeAddTop')}
            className="w-6 h-6 flex items-center justify-center rounded text-tM hover:bg-bg2 hover:text-t1 transition-colors border-0 bg-transparent"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[17px] h-[17px]">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {topLevels.map((tl) => (
          <div key={tl.id} className="mb-0.5">
            {/* TopLevel row */}
            <div
              className="flex items-center gap-1 px-2 py-1.5 mx-1 rounded cursor-pointer hover:bg-[#292e36] group transition-colors"
              onClick={() => toggleTL(tl.id)}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`w-5 h-5 text-tM shrink-0 transition-transform ${collapsedTL.has(tl.id) ? '-rotate-90' : ''}`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-aO shrink-0 mr-0.5">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>

              {editingTL === tl.id ? (
                <IMEInput
                  autoFocus
                  value={editTLName}
                  onValueChange={setEditTLName}
                  onBlur={() => commitEditTL(tl.id)}
                  onKeyDown={(e) => handleEditKeyDown(e as unknown as KeyboardEvent, tl.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 bg-bg0 border border-aB rounded px-1.5 py-0.5 text-t1 text-xs focus:outline-none"
                />
              ) : (
                <span className="flex-1 text-t1 text-[13px] font-semibold truncate">{tl.name}</span>
              )}

              <span className="text-tM font-mono text-[10px] bg-bg2 px-1.5 py-0.5 rounded-full">
                {totalResults(tl)}
              </span>

              <div className="hidden group-hover:flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setWpConfigTopic({ id: tl.id, name: tl.name })}
                  className="w-5 h-5 flex items-center justify-center rounded text-tM hover:bg-aB/15 hover:text-aB transition-colors border-0 bg-transparent"
                  title={t('treeWpConfig')}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M3.5 12l3.2 8.5L9 13l4-1-4-1L6.7 3.5 3.5 12z" />
                  </svg>
                </button>
                <button
                  onClick={() => setShopifyConfigTopic({ id: tl.id, name: tl.name })}
                  className="w-5 h-5 flex items-center justify-center rounded text-tM hover:bg-aG/15 hover:text-aG transition-colors border-0 bg-transparent"
                  title={t('treeShopifyConfig')}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5">
                    <path d="M15.5 2.5L14 4l1 2-1 1 3 3 1-1 2 1 1.5-1.5-5-5z" />
                    <path d="M14 4l-9.5 9.5a2 2 0 0 0 0 2.83l2.17 2.17a2 2 0 0 0 2.83 0L19 9" />
                  </svg>
                </button>
                <button
                  onClick={() => startEditTL(tl)}
                  className="w-5 h-5 flex items-center justify-center rounded text-tM hover:bg-bg2 hover:text-t1 transition-colors border-0 bg-transparent"
                  title={t('treeEdit')}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  onClick={() => onDeleteTopLevel(tl.id)}
                  className="w-5 h-5 flex items-center justify-center rounded text-tM hover:bg-aR/15 hover:text-aR transition-colors border-0 bg-transparent"
                  title={t('treeDelete')}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                    <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Keywords */}
            {!collapsedTL.has(tl.id) && (
              <div className="relative ml-6">
                <div className="absolute left-0 top-0 bottom-0 w-px bg-bd" />

                {tl.keywords.map((kw) => (
                  <KeywordCard
                    key={kw.id}
                    keyword={kw}
                    isExpanded={!collapsedKW.has(kw.id)}
                    isSelected={selectedKeywordId === kw.id}
                    isGenerating={generatingId === kw.id}
                    onToggle={() => toggleKW(kw.id)}
                    onDelete={() => onDeleteKeyword(kw.id)}
                    onUpdate={(data) => onUpdateKeyword(kw.id, data)}
                    onGenerate={() => onGenerate(kw.id)}
                    onCancel={onCancelGenerate}
                    onViewResults={() => onSelectKeyword(tl.id, kw.id)}
                  />
                ))}

                <button
                  onClick={() => onAddKeyword(tl.id)}
                  className="ml-3 my-1 flex items-center gap-1.5 px-2.5 py-1.5 text-tM text-[11px] italic border border-dashed border-bd rounded-md hover:border-aB hover:text-aB hover:bg-aB/[0.04] transition-all bg-transparent w-[calc(100%-12px)]"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[15px] h-[15px] shrink-0">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  {t('treeAddKeyword')}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {wpConfigTopic && (
        <WpConfigModal
          topLevelId={wpConfigTopic.id}
          topicName={wpConfigTopic.name}
          onClose={() => setWpConfigTopic(null)}
        />
      )}
      {shopifyConfigTopic && (
        <ShopifyConfigModal
          topLevelId={shopifyConfigTopic.id}
          topicName={shopifyConfigTopic.name}
          onClose={() => setShopifyConfigTopic(null)}
        />
      )}
    </div>
  );
}

// ── Inline Keyword Card ───────────────────────────────────────────────────────
interface KWCardProps {
  keyword: Keyword;
  isExpanded: boolean;
  isSelected: boolean;
  isGenerating: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onUpdate: (data: { keyword?: string; goal?: string; audience?: string }) => void;
  onGenerate: () => void;
  onCancel: () => void;
  onViewResults: () => void;
}

function KeywordCard({
  keyword,
  isExpanded,
  isSelected,
  isGenerating,
  onToggle,
  onDelete,
  onUpdate,
  onGenerate,
  onCancel,
  onViewResults,
}: KWCardProps) {
  const { t } = useLanguage();
  const [kwVal, setKwVal] = useState(keyword.keyword);
  const [goalVal, setGoalVal] = useState(keyword.goal);
  const [audVal, setAudVal] = useState(keyword.audience);

  return (
    <div className={`mx-3 my-1 bg-bg0 border rounded-lg overflow-hidden transition-all ${
      isSelected ? 'border-aB/40 shadow-[0_0_0_1px_rgba(88,166,255,0.1)]' : 'border-bd'
    }`}>
      {/* Header row */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-2 cursor-pointer hover:bg-[#292e36] transition-colors group"
        onClick={onToggle}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`w-4 h-4 text-tM shrink-0 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-aC shrink-0">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
        <span className="flex-1 text-xs font-medium text-t1 truncate">{keyword.keyword}</span>
        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-full bg-aB/15 text-aB shrink-0">
          {keyword.results.length}
        </span>
        <div className="hidden group-hover:flex" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onDelete}
            className="w-5 h-5 flex items-center justify-center rounded text-tM hover:bg-aR/15 hover:text-aR transition-colors border-0 bg-transparent"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expandable body */}
      {isExpanded && (
        <div className="px-2.5 pb-2.5 space-y-2" onClick={(e) => e.stopPropagation()}>
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-tM text-[10px] font-mono uppercase tracking-wider">
              {t('kwKeyword')}
              <span className="text-[8px] px-1 rounded bg-aB/15 text-aB normal-case tracking-normal">required</span>
            </label>
            <IMEInput
              value={kwVal}
              onValueChange={setKwVal}
              onBlur={() => { if (kwVal.trim() !== keyword.keyword) onUpdate({ keyword: kwVal.trim() }); }}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              className="w-full bg-bg1 border border-bd rounded px-2 py-1.5 text-t1 text-xs focus:outline-none focus:border-aB transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-tM text-[10px] font-mono uppercase tracking-wider">{t('kwGoal')}</label>
            <IMEInput
              value={goalVal}
              onValueChange={setGoalVal}
              onBlur={() => { if (goalVal !== keyword.goal) onUpdate({ goal: goalVal }); }}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              placeholder={t('kwGoalPlaceholder')}
              className="w-full bg-bg1 border border-bd rounded px-2 py-1.5 text-t1 text-xs focus:outline-none focus:border-aB transition-colors placeholder-tM"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-tM text-[10px] font-mono uppercase tracking-wider">{t('kwAudience')}</label>
            <IMETextarea
              value={audVal}
              onValueChange={setAudVal}
              onBlur={() => { if (audVal !== keyword.audience) onUpdate({ audience: audVal }); }}
              rows={2}
              className="w-full bg-bg1 border border-bd rounded px-2 py-1.5 text-t1 text-xs focus:outline-none focus:border-aB transition-colors resize-y min-h-[36px] leading-relaxed"
            />
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={onGenerate}
              disabled={isGenerating}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-semibold text-white bg-gradient-to-r from-aB to-aP hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(88,166,255,0.3)] active:translate-y-0"
            >
              {isGenerating ? (
                <><span className="animate-spin inline-block">⟳</span> {t('kwGenerating')}</>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                  </svg>
                  {t('kwGenerate')}
                </>
              )}
            </button>
            {isGenerating && (
              <button
                onClick={onCancel}
                title="Cancel generation"
                className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-aR bg-aR/10 hover:bg-aR/20 border border-aR/30 transition-colors cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <button
            onClick={onViewResults}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] text-t1 bg-bg2 border border-bd hover:bg-[#292e36] transition-colors cursor-pointer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            {t('kwViewResults')} ({keyword.results.length})
          </button>
        </div>
      )}
    </div>
  );
}
