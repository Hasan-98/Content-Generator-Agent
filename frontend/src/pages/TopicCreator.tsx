import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { TopLevel } from '../types';
import { getTopLevels, createTopLevel, updateTopLevel, deleteTopLevel } from '../api/topics';
import { createKeyword, updateKeyword, deleteKeyword } from '../api/keywords';
import { updateResult, deleteResult } from '../api/results';
import { generateResults } from '../api/generate';
import { useLanguage } from '../context/LanguageContext';
import TopicTree from '../components/topic/TopicTree';
import ResultsTable from '../components/topic/ResultsTable';

// ── Keywords Overview (default center view) ───────────────────────────────────
function KeywordsOverview({
  topLevels,
  onSelectKeyword,
  onRenameTopLevel,
}: {
  topLevels: TopLevel[];
  onSelectKeyword: (tlId: string, kwId: string) => void;
  onRenameTopLevel: (id: string, name: string) => void;
}) {
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editTopicName, setEditTopicName] = useState('');

  function startEdit(tl: TopLevel, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingTopicId(tl.id);
    setEditTopicName(tl.name);
  }

  function commitEdit() {
    if (editingTopicId && editTopicName.trim()) {
      onRenameTopLevel(editingTopicId, editTopicName.trim());
    }
    setEditingTopicId(null);
  }

  const allRows = topLevels.flatMap((tl) =>
    tl.keywords.map((kw) => ({ tl, kw }))
  );

  const totalKeywords = allRows.length;
  const drafted = allRows.filter((r) => r.kw.results.length === 0).length;
  const hasResults = allRows.filter((r) => r.kw.results.length > 0).length;

  if (allRows.length === 0) {
    return (
      <div className="text-center py-16 text-tM text-sm">
        <p>No topics yet.</p>
        <p className="text-xs mt-1 opacity-50">Add a top-level topic and keywords from the sidebar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary stats */}
      <div className="flex gap-3">
        {[
          { label: 'topics', value: topLevels.length, color: 'text-aB' },
          { label: 'keywords', value: totalKeywords, color: 'text-aP' },
          { label: 'with results', value: hasResults, color: 'text-aG' },
          { label: 'draft', value: drafted, color: 'text-t2' },
        ].map((s) => (
          <div key={s.label} className="flex-1 bg-bg1 border border-bd rounded-lg px-4 py-3">
            <div className="text-tM text-[10px] font-mono uppercase tracking-wider mb-1">{s.label}</div>
            <div className={`text-[22px] font-bold font-mono ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-bg1 border border-bd rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-bg2">
                <th className="px-4 py-2 text-left font-mono text-[11px] font-semibold uppercase tracking-wider text-tM">Topic</th>
                <th className="px-4 py-2 text-left font-mono text-[11px] font-semibold uppercase tracking-wider text-tM">Keyword</th>
                <th className="px-4 py-2 text-left font-mono text-[11px] font-semibold uppercase tracking-wider text-tM">Results</th>
                <th className="px-4 py-2 text-left font-mono text-[11px] font-semibold uppercase tracking-wider text-tM">Status</th>
              </tr>
            </thead>
            <tbody>
              {allRows.map(({ tl, kw }) => {
                const count = kw.results.length;
                const hasPublished = kw.results.some((r) => r.status === 'PUBLISHED');
                const hasDone = kw.results.some((r) => r.status === 'DONE');
                const hasProgress = kw.results.some((r) => r.status === 'PROGRESS');
                const hasReady = kw.results.some((r) => r.status === 'READY');
                const statusLabel = count === 0
                  ? 'draft'
                  : hasPublished ? 'published'
                  : hasDone ? 'done'
                  : hasProgress ? 'in progress'
                  : hasReady ? 'ready'
                  : 'draft';
                const statusStyle = count === 0
                  ? 'bg-t2/15 text-t2'
                  : hasPublished ? 'bg-aP/15 text-aP'
                  : hasDone ? 'bg-aG/15 text-aG'
                  : hasProgress ? 'bg-aO/15 text-aO'
                  : hasReady ? 'bg-aB/15 text-aB'
                  : 'bg-t2/15 text-t2';
                const dotStyle = count === 0
                  ? 'bg-t2'
                  : hasPublished ? 'bg-aP'
                  : hasDone ? 'bg-aG'
                  : hasProgress ? 'bg-aO'
                  : hasReady ? 'bg-aB'
                  : 'bg-t2';

                return (
                  <tr
                    key={kw.id}
                    onClick={() => onSelectKeyword(tl.id, kw.id)}
                    className="border-t border-bd/50 hover:bg-aB/[0.04] cursor-pointer transition-colors group"
                  >
                    <td
                      className="px-4 py-2.5 text-aO text-xs font-semibold"
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => startEdit(tl, e)}
                    >
                      {editingTopicId === tl.id ? (
                        <input
                          autoFocus
                          value={editTopicName}
                          onChange={(e) => setEditTopicName(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitEdit();
                            if (e.key === 'Escape') setEditingTopicId(null);
                          }}
                          className="bg-bg0 border border-aB rounded px-1.5 py-0.5 text-aO text-xs focus:outline-none w-full"
                        />
                      ) : (
                        <span title="Double-click to rename">{tl.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-aC">{kw.keyword}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-t2">{count}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${statusStyle}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${dotStyle}`} />
                        {statusLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function TopicCreator() {
  const { lang, t } = useLanguage();
  const [topLevels, setTopLevels] = useState<TopLevel[]>([]);
  const [selectedTopLevelId, setSelectedTopLevelId] = useState<string | null>(null);
  const [selectedKeywordId, setSelectedKeywordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => { loadTopLevels(); }, []);

  async function loadTopLevels() {
    try {
      const data = await getTopLevels();
      setTopLevels(data);
      // Auto-select first keyword that has results so the table is immediately visible
      for (const tl of data) {
        for (const kw of tl.keywords) {
          if (kw.results.length > 0) {
            setSelectedTopLevelId(tl.id);
            setSelectedKeywordId(kw.id);
            return;
          }
        }
      }
      // Fallback: select first keyword even if it has no results
      if (data[0]?.keywords[0]) {
        setSelectedTopLevelId(data[0].id);
        setSelectedKeywordId(data[0].keywords[0].id);
      }
    } catch {
      toast.error(t('toastTopicLoadFailed'));
    } finally {
      setLoading(false);
    }
  }

  const selectedTopLevel = topLevels.find((tl) => tl.id === selectedTopLevelId) ?? null;
  const selectedKeyword = selectedTopLevel?.keywords.find((kw) => kw.id === selectedKeywordId) ?? null;

  async function handleAddTopLevel(name: string) {
    try {
      const tl = await createTopLevel(name);
      setTopLevels((prev) => [...prev, tl]);
      setSelectedTopLevelId(tl.id);
      setSelectedKeywordId(null);
      toast.success(t('toastTopicCreated'));
    } catch {
      toast.error(t('toastTopicCreateFailed'));
    }
  }

  async function handleRenameTopLevel(id: string, name: string) {
    try {
      const updated = await updateTopLevel(id, name);
      setTopLevels((prev) => prev.map((tl) => (tl.id === id ? { ...tl, ...updated } : tl)));
    } catch {
      toast.error(t('toastRenameFailed'));
    }
  }

  async function handleDeleteTopLevel(id: string) {
    if (!window.confirm(t('toastTopicDeleteConfirm'))) return;
    try {
      await deleteTopLevel(id);
      setTopLevels((prev) => prev.filter((tl) => tl.id !== id));
      if (selectedTopLevelId === id) { setSelectedTopLevelId(null); setSelectedKeywordId(null); }
      toast.success(t('toastTopicDeleted'));
    } catch {
      toast.error(t('toastDeleteFailed'));
    }
  }

  async function handleAddKeyword(topLevelId: string) {
    try {
      const kw = await createKeyword({ topLevelId, keyword: t('topicNewKeyword') });
      setTopLevels((prev) =>
        prev.map((tl) => tl.id === topLevelId ? { ...tl, keywords: [...tl.keywords, kw] } : tl)
      );
      toast.success(t('toastKwAdded'));
    } catch {
      toast.error(t('toastKwAddFailed'));
    }
  }

  async function handleUpdateKeyword(id: string, data: { keyword?: string; goal?: string; audience?: string }) {
    try {
      const updated = await updateKeyword(id, data);
      setTopLevels((prev) =>
        prev.map((tl) => ({
          ...tl,
          keywords: tl.keywords.map((kw) => kw.id === id ? { ...kw, ...updated } : kw),
        }))
      );
    } catch {
      toast.error(t('toastUpdateFailed'));
    }
  }

  async function handleDeleteKeyword(id: string) {
    try {
      await deleteKeyword(id);
      setTopLevels((prev) =>
        prev.map((tl) => ({ ...tl, keywords: tl.keywords.filter((kw) => kw.id !== id) }))
      );
      if (selectedKeywordId === id) setSelectedKeywordId(null);
      toast.success(t('toastResultDeleted'));
    } catch {
      toast.error(t('toastDeleteFailed'));
    }
  }

  async function handleUpdateResult(id: string, data: { title?: string; status?: string }) {
    try {
      const updated = await updateResult(id, data);
      setTopLevels((prev) =>
        prev.map((tl) => ({
          ...tl,
          keywords: tl.keywords.map((kw) => ({
            ...kw,
            results: kw.results.map((r) => (r.id === id ? { ...r, ...updated } : r)),
          })),
        }))
      );
    } catch {
      toast.error(t('toastUpdateFailed'));
    }
  }

  async function handleDeleteResult(id: string) {
    try {
      await deleteResult(id);
      setTopLevels((prev) =>
        prev.map((tl) => ({
          ...tl,
          keywords: tl.keywords.map((kw) => ({
            ...kw,
            results: kw.results.filter((r) => r.id !== id),
          })),
        }))
      );
      toast.success(t('toastResultDeleted'));
    } catch {
      toast.error(t('toastDeleteFailed'));
    }
  }

  async function handleGenerate(keywordId: string) {
    setGeneratingId(keywordId);
    const tl = topLevels.find((topic) => topic.keywords.some((k) => k.id === keywordId));
    if (tl) { setSelectedTopLevelId(tl.id); setSelectedKeywordId(keywordId); }
    try {
      const newResults = await generateResults(keywordId);
      setTopLevels((prev) =>
        prev.map((tl) => ({
          ...tl,
          keywords: tl.keywords.map((kw) =>
            kw.id === keywordId ? { ...kw, results: [...newResults, ...kw.results] } : kw
          ),
        }))
      );
      toast.success(
        lang === 'en'
          ? `${newResults.length} keywords generated`
          : `${newResults.length}件のキーワードを生成しました`
      );
    } catch {
      toast.error(t('toastGenerateFailed'));
    } finally {
      setGeneratingId(null);
    }
  }

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-t2 text-sm">{t('topicLoading')}</div>;
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <TopicTree
        topLevels={topLevels}
        selectedKeywordId={selectedKeywordId}
        onSelectKeyword={(tlId, kwId) => { setSelectedTopLevelId(tlId); setSelectedKeywordId(kwId); }}
        onRenameTopLevel={handleRenameTopLevel}
        onDeleteTopLevel={handleDeleteTopLevel}
        onAddTopLevel={handleAddTopLevel}
        onAddKeyword={handleAddKeyword}
        onDeleteKeyword={handleDeleteKeyword}
        onUpdateKeyword={handleUpdateKeyword}
        onGenerate={handleGenerate}
        generatingId={generatingId}
      />

      {/* Main editor */}
      <div className="flex-1 flex flex-col overflow-hidden bg-bg0">
        {/* Breadcrumb */}
        <div className="h-8 border-b border-bd flex items-center px-4 gap-1.5 shrink-0 font-mono text-[11px] text-tM">
          <span>workspace</span>
          <span>›</span>
          <span className="text-t2">{t('topicBreadcrumb')}</span>
          {selectedTopLevel && (
            <><span>›</span><span className="text-t2">{selectedTopLevel.name}</span></>
          )}
          {selectedKeyword && (
            <><span>›</span><span className="text-aC">{selectedKeyword.keyword}</span></>
          )}
        </div>

        {/* Generating progress bar */}
        {generatingId && (
          <div className="h-0.5 bg-bg2 shrink-0 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-aB to-aP animate-[loading_1.2s_ease-in-out_infinite]" style={{ width: '30%' }} />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* AI Flow */}
          <div className="bg-bg1 border border-bd rounded-[10px] overflow-hidden">
            <div className="flex items-center gap-2.5 px-[18px] py-3.5 border-b border-bd">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-aP animate-pulse">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
              </svg>
              <h2 className="text-t1 text-[15px] font-semibold">{t('topicAiFlowTitle')}</h2>
            </div>
            <div className="flex p-4 gap-2 overflow-x-auto">
              {[
                { step: 'STEP 01', title: t('topicStep1Title'), desc: t('topicStep1Desc'), accent: 'border-t-aB' },
                { step: 'STEP 02', title: t('topicStep2Title'), desc: t('topicStep2Desc'), accent: 'border-t-aP' },
                { step: 'STEP 03', title: t('topicStep3Title'), desc: t('topicStep3Desc'), accent: 'border-t-aG' },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-2 flex-1 min-w-[160px]">
                  <div className={`flex-1 bg-bg0 border border-bd rounded-lg p-3 border-t-2 ${s.accent}`}>
                    <div className="text-tM font-mono text-[10px] mb-1">{s.step}</div>
                    <div className="text-t1 text-xs font-semibold mb-1 leading-snug">{s.title}</div>
                    <div className="text-t2 text-[11px] leading-relaxed">{s.desc}</div>
                  </div>
                  {i < 2 && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-tM shrink-0">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Results */}
          {!selectedKeyword ? (
            <KeywordsOverview
              topLevels={topLevels}
              onSelectKeyword={(tlId: string, kwId: string) => { setSelectedTopLevelId(tlId); setSelectedKeywordId(kwId); }}
              onRenameTopLevel={handleRenameTopLevel}
            />
          ) : (
            <ResultsTable
              results={selectedKeyword.results}
              onUpdateResult={handleUpdateResult}
              onDeleteResult={handleDeleteResult}
            />
          )}
        </div>
      </div>
    </div>
  );
}
