import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import type { TopLevel, GeneratedResult } from '../../types';
import WpConfigModal from '../user/WpConfigModal';
import ShopifyConfigModal from '../user/ShopifyConfigModal';
import { IMEInput } from '../common/IMEInput';

interface Props {
  topLevels: TopLevel[];
  selectedResultId: string | null;
  onSelect: (result: GeneratedResult) => void;
  onOpenRef: (result: GeneratedResult) => void;
  onRename: (id: string, newTitle: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const ARTICLE_STATUS_COLOR: Record<string, string> = {
  READY:        '#58a6ff',
  WRITING:      '#d29922',
  ARTICLE_DONE: '#39d2c0',
  IMAGING:      '#bc8cff',
  IMAGE_DONE:   '#3fb950',
  UPLOADED:     '#f85149',
};

const ARTICLE_STATUS_LABEL_KEY: Record<string, string> = {
  READY:        'articleStatusReady',
  WRITING:      'articleStatusWriting',
  ARTICLE_DONE: 'articleStatusArticleDone',
  IMAGING:      'articleStatusImaging',
  IMAGE_DONE:   'articleStatusImageDone',
  UPLOADED:     'articleStatusUploaded',
};

type FilterValue = 'ALL' | 'NO_ARTICLE' | 'WRITING' | 'ARTICLE_DONE' | 'IMAGE_DONE' | 'UPLOADED';

const FILTER_OPTIONS: { value: FilterValue; colorKey: string }[] = [
  { value: 'ALL',          colorKey: '#8b949e' },
  { value: 'NO_ARTICLE',   colorKey: '#58a6ff' },
  { value: 'WRITING',      colorKey: '#d29922' },
  { value: 'ARTICLE_DONE', colorKey: '#39d2c0' },
  { value: 'IMAGE_DONE',   colorKey: '#3fb950' },
  { value: 'UPLOADED',     colorKey: '#f85149' },
];

export default function ArticleTree({ topLevels, selectedResultId, onSelect, onOpenRef, onRename, onDelete }: Props) {
  const { t } = useLanguage();
  const [wpConfigTopic, setWpConfigTopic] = useState<{ id: string; name: string } | null>(null);
  const [shopifyConfigTopic, setShopifyConfigTopic] = useState<{ id: string; name: string } | null>(null);
  const [filter, setFilter] = useState<FilterValue>('ALL');
  const [collapsedTL, setCollapsedTL] = useState<Set<string>>(new Set());
  const [collapsedKW, setCollapsedKW] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<GeneratedResult | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function commitRename(id: string, originalTitle: string) {
    const trimmed = editDraft.trim();
    setEditingId(null);
    if (!trimmed || trimmed === originalTitle) return;
    try {
      await onRename(id, trimmed);
    } catch { /* parent handles toast */ }
  }

  async function handleConfirmDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await onDelete(confirmDelete.id);
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  const allItems = topLevels.flatMap((tl) =>
    tl.keywords.flatMap((kw) =>
      kw.results
        .filter((r) => r.status === 'STRUCT_DONE' || r.status === 'PUBLISHED')
        .map((r) => ({ tl, kw, result: r }))
    )
  );

  const articleItems = filter === 'ALL'
    ? allItems
    : allItems.filter(({ result }) => {
        const artStatus = result.article?.status;
        if (filter === 'NO_ARTICLE') return !artStatus || artStatus === 'READY';
        if (filter === 'WRITING') return artStatus === 'WRITING' || artStatus === 'ARTICLE_DONE';
        if (filter === 'ARTICLE_DONE') return artStatus === 'ARTICLE_DONE';
        if (filter === 'IMAGE_DONE') return artStatus === 'IMAGING' || artStatus === 'IMAGE_DONE';
        if (filter === 'UPLOADED') return artStatus === 'UPLOADED' || artStatus === 'FORMAT_DONE' || artStatus === 'FORMATTING';
        return true;
      });

  function toggleTL(id: string) {
    setCollapsedTL((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleKW(id: string) {
    setCollapsedKW((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function collapseAll() {
    setCollapsedTL(new Set(topLevels.map((tl) => tl.id)));
    setCollapsedKW(new Set(topLevels.flatMap((tl) => tl.keywords.map((k) => k.id))));
  }

  const totalResults = (tl: TopLevel) => {
    const tlItems = articleItems.filter(i => i.tl.id === tl.id);
    return tlItems.length;
  };

  return (
    <>
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          title={t('sidebarShow')}
          className="w-9 bg-bg1 border-r border-bd flex items-start justify-center pt-2.5 text-aB hover:bg-bg2 transition-colors shrink-0"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 3v18" />
            <path d="M14 9l3 3-3 3" />
          </svg>
        </button>
      )}
    <div className={`${sidebarOpen ? 'w-80' : 'w-0'} bg-bg1 border-r border-bd flex flex-col overflow-hidden shrink-0 transition-[width] duration-150`}>
      {/* Header — matches Topic Settings style */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-bd">
        <span className="text-t2 text-[11px] font-semibold uppercase tracking-widest">{t('articleSidebarHeader')}</span>
        <div className="flex gap-1 items-center">
          <span className="text-[10px] text-tM mr-1">{articleItems.length}/{allItems.length}</span>
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
            onClick={() => setSidebarOpen(false)}
            title={t('sidebarHide')}
            className="w-7 h-7 flex items-center justify-center rounded text-aB hover:bg-bg2 transition-colors border-0 bg-transparent"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18" />
              <path d="M17 9l-3 3 3 3" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-bd shrink-0">
        {FILTER_OPTIONS.map((opt) => {
          const active = filter === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                active
                  ? 'border-current bg-current/15'
                  : 'border-bd text-tM hover:text-t2 hover:border-t2'
              }`}
              style={active ? { color: opt.colorKey } : undefined}
            >
              {t(`articleFilter${opt.value}` as any)}
            </button>
          );
        })}
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {articleItems.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-xs text-tM">{t('articleNoItems')}</p>
            <p className="text-[11px] text-tM/60 mt-1">{t('articleNoItemsHint')}</p>
          </div>
        ) : (
          topLevels.map((tl) => {
            const tlItems = articleItems.filter(i => i.tl.id === tl.id);
            if (tlItems.length === 0) return null;
            return (
              <div key={tl.id} className="mb-0.5">
                {/* TopLevel row — same as Topic tree */}
                <div
                  className="flex items-center gap-1 px-2 py-1.5 mx-1 rounded cursor-pointer hover:bg-bg2 group transition-colors"
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
                  <span className="flex-1 text-t1 text-[13px] font-semibold truncate">{tl.name}</span>
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
                  </div>
                </div>

                {/* Keywords with result cards */}
                {!collapsedTL.has(tl.id) && (
                  <div className="relative ml-6">
                    <div className="absolute left-0 top-0 bottom-0 w-px bg-bd" />

                    {tl.keywords.map((kw) => {
                      const kwItems = tlItems.filter(i => i.kw.id === kw.id);
                      if (kwItems.length === 0) return null;
                      const isKWExpanded = !collapsedKW.has(kw.id);

                      return (
                        <div key={kw.id} className={`mx-3 my-1 bg-bg0 border rounded-lg overflow-hidden transition-all ${
                          kwItems.some(i => i.result.id === selectedResultId) ? 'border-aB/40 shadow-[0_0_0_1px_rgba(88,166,255,0.1)]' : 'border-bd'
                        }`}>
                          {/* Keyword header — matches Topic keyword card */}
                          <div
                            className="flex items-center gap-1.5 px-2.5 py-2 cursor-pointer hover:bg-bg2 transition-colors group"
                            onClick={() => toggleKW(kw.id)}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              className={`w-4 h-4 text-tM shrink-0 transition-transform ${isKWExpanded ? '' : '-rotate-90'}`}
                            >
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-aC shrink-0">
                              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                              <line x1="7" y1="7" x2="7.01" y2="7" />
                            </svg>
                            <span className="flex-1 text-xs font-medium text-t1 truncate">{kw.keyword}</span>
                            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-full bg-aB/15 text-aB shrink-0">
                              {kwItems.length}
                            </span>
                          </div>

                          {/* Expandable result list */}
                          {isKWExpanded && (
                            <div className="px-2.5 pb-2.5 space-y-1.5">
                              {kwItems.map(({ result }) => {
                                const articleStatus = result.article?.status ?? 'READY';
                                const color = ARTICLE_STATUS_COLOR[articleStatus] ?? '#8b949e';
                                const labelKey = ARTICLE_STATUS_LABEL_KEY[articleStatus];
                                const label = labelKey ? t(labelKey as any) : articleStatus;
                                const isSelected = result.id === selectedResultId;

                                const isEditing = editingId === result.id;
                                return (
                                  <div
                                    key={result.id}
                                    onClick={() => !isEditing && onSelect(result)}
                                    className={`group rounded-md px-2.5 py-2 transition-all ${
                                      isEditing ? '' : 'cursor-pointer'
                                    } ${
                                      isSelected
                                        ? 'bg-aB/10 border border-aB/30'
                                        : 'bg-bg1 border border-bd hover:border-aB/30 hover:bg-bg2'
                                    }`}
                                  >
                                    {isEditing ? (
                                      <IMEInput
                                        autoFocus
                                        value={editDraft}
                                        onValueChange={setEditDraft}
                                        onClick={(e) => e.stopPropagation()}
                                        onBlur={() => commitRename(result.id, result.title)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') commitRename(result.id, result.title);
                                          if (e.key === 'Escape') setEditingId(null);
                                        }}
                                        className="w-full text-xs text-t1 bg-bg0 border border-aB rounded px-1.5 py-1 mb-1.5 focus:outline-none"
                                      />
                                    ) : (
                                      <div className="text-xs text-t1 leading-snug line-clamp-2 mb-1.5">
                                        {result.title}
                                      </div>
                                    )}
                                    <div className="flex items-center justify-between">
                                      <span
                                        className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                                        style={{ background: `${color}22`, color }}
                                      >
                                        {label}
                                      </span>
                                      <div className="flex items-center gap-0.5">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditDraft(result.title);
                                            setEditingId(result.id);
                                          }}
                                          className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded text-tM hover:text-aB hover:bg-aB/10 transition-all"
                                          title={t('treeEdit')}
                                        >
                                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                                            <path d="M12 20h9" />
                                            <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                                          </svg>
                                        </button>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); setConfirmDelete(result); }}
                                          className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded text-tM hover:text-aR hover:bg-aR/10 transition-all"
                                          title={t('treeDelete')}
                                        >
                                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                                            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
                                            <line x1="10" y1="11" x2="10" y2="17" />
                                            <line x1="14" y1="11" x2="14" y2="17" />
                                          </svg>
                                        </button>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); onOpenRef(result); }}
                                          className="w-5 h-5 flex items-center justify-center text-tM hover:text-aB transition-colors"
                                          title={t('articleRefHint')}
                                        >
                                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                                            <circle cx="12" cy="12" r="10" />
                                            <line x1="12" y1="16" x2="12" y2="12" />
                                            <line x1="12" y1="8" x2="12.01" y2="8" />
                                          </svg>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {wpConfigTopic && (
        <WpConfigModal topLevelId={wpConfigTopic.id} topicName={wpConfigTopic.name} onClose={() => setWpConfigTopic(null)} />
      )}
      {shopifyConfigTopic && (
        <ShopifyConfigModal topLevelId={shopifyConfigTopic.id} topicName={shopifyConfigTopic.name} onClose={() => setShopifyConfigTopic(null)} />
      )}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !deleting && setConfirmDelete(null)}
        >
          <div onClick={(e) => e.stopPropagation()} className="bg-bg1 border border-bd rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-bd flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-aR/15 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-aR">
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-t1">{t('articleDeleteConfirmTitle')}</h3>
                <p className="text-[11px] text-tM mt-0.5">{t('articleDeleteConfirmDesc')}</p>
              </div>
            </div>
            <div className="px-5 py-3 bg-bg0/50">
              <p className="text-xs text-t2 line-clamp-3">{confirmDelete.title}</p>
            </div>
            <div className="px-5 py-3 flex justify-end gap-2 border-t border-bd">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="text-[11px] px-3 py-1.5 rounded border border-bd text-t2 hover:text-t1 transition-colors disabled:opacity-50"
              >
                {t('articleDeleteCancel')}
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="text-[11px] px-3 py-1.5 rounded bg-aR/20 text-aR border border-aR/40 hover:bg-aR/30 transition-colors disabled:opacity-50 font-medium"
              >
                {deleting ? t('articleDeleting') : t('articleDeleteConfirmBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
