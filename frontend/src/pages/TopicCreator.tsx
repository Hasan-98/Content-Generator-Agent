import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { TopLevel, GeneratedResult } from '../types';
import { getTopLevels, createTopLevel, updateTopLevel, deleteTopLevel } from '../api/topics';
import { createKeyword, updateKeyword, deleteKeyword } from '../api/keywords';
import { updateResult, deleteResult, skipResult, restoreResult } from '../api/results';
import { generateResults, generatePersona } from '../api/generate';
import { runFactCheck } from '../api/factcheck';
import { useLanguage } from '../context/LanguageContext';
import TopicTree from '../components/topic/TopicTree';
import ResultsTable from '../components/topic/ResultsTable';
import FlowSteps from '../components/topic/FlowSteps';
import BulkActions from '../components/topic/BulkActions';
import DetailPanel from '../components/topic/DetailPanel';

type FilterStep = '01' | '02' | '03' | 'all';

export default function TopicCreator() {
  const { lang, t } = useLanguage();
  const [topLevels, setTopLevels] = useState<TopLevel[]>([]);
  const [selectedTopLevelId, setSelectedTopLevelId] = useState<string | null>(null);
  const [selectedKeywordId, setSelectedKeywordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [filterStep, setFilterStep] = useState<FilterStep>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailResult, setDetailResult] = useState<GeneratedResult | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  useEffect(() => { loadTopLevels(); }, []);

  async function loadTopLevels() {
    try {
      const data = await getTopLevels();
      setTopLevels(data);
      for (const tl of data) {
        for (const kw of tl.keywords) {
          if (kw.results.length > 0) {
            setSelectedTopLevelId(tl.id);
            setSelectedKeywordId(kw.id);
            return;
          }
        }
      }
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

  function updateResultInState(updated: GeneratedResult) {
    setTopLevels((prev) =>
      prev.map((tl) => ({
        ...tl,
        keywords: tl.keywords.map((kw) => ({
          ...kw,
          results: kw.results.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)),
        })),
      }))
    );
    if (detailResult?.id === updated.id) setDetailResult({ ...detailResult, ...updated });
  }

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

  async function handleUpdateResult(id: string, data: Record<string, unknown>) {
    try {
      const updated = await updateResult(id, data);
      updateResultInState(updated);
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
      if (detailResult?.id === id) setDetailResult(null);
      toast.success(t('toastResultDeleted'));
    } catch {
      toast.error(t('toastDeleteFailed'));
    }
  }

  async function handleSkip(id: string) {
    try {
      const updated = await skipResult(id);
      updateResultInState(updated);
      toast.success(t('toastSkipped'));
    } catch {
      toast.error(t('toastSkipFailed'));
    }
  }

  async function handleRestore(id: string) {
    try {
      const updated = await restoreResult(id);
      updateResultInState(updated);
      toast.success(t('toastRestored'));
    } catch {
      toast.error(t('toastRestoreFailed'));
    }
  }

  async function handleGoStep2(id: string) {
    setBusyIds((prev) => new Set(prev).add(id));
    // Optimistically set PERSONA_WIP
    updateResultInState({ ...(selectedKeyword?.results.find(r => r.id === id) as GeneratedResult), status: 'PERSONA_WIP' });
    toast.loading(t('toastPersonaGenerating'), { id: `persona-${id}` });
    try {
      const updated = await generatePersona(id);
      updateResultInState(updated);
      toast.success(t('toastPersonaDone'), { id: `persona-${id}` });
    } catch {
      toast.error(t('toastPersonaFailed'), { id: `persona-${id}` });
      // Rollback on error
      updateResultInState({ ...(selectedKeyword?.results.find(r => r.id === id) as GeneratedResult), status: 'READY' });
    } finally {
      setBusyIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  async function handleGoStep3(id: string) {
    setBusyIds((prev) => new Set(prev).add(id));
    updateResultInState({ ...(selectedKeyword?.results.find(r => r.id === id) as GeneratedResult), status: 'STRUCT_WIP' });
    toast.loading(t('toastFactCheckRunning'), { id: `fc-${id}` });
    try {
      const updated = await runFactCheck(id);
      updateResultInState(updated);
      toast.success(t('toastFactCheckDone'), { id: `fc-${id}` });
    } catch {
      toast.error(t('toastFactCheckFailed'), { id: `fc-${id}` });
      updateResultInState({ ...(selectedKeyword?.results.find(r => r.id === id) as GeneratedResult), status: 'PERSONA_DONE' });
    } finally {
      setBusyIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
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

  // Bulk actions
  async function handleBulkNextStep() {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      const result = selectedKeyword?.results.find(r => r.id === id);
      if (result && (result.status === 'READY' || result.status === 'KW_DONE')) {
        await handleGoStep2(id);
      }
    }
    setSelectedIds(new Set());
  }

  async function handleBulkGeneratePersona() {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await handleGoStep2(id);
    }
    setSelectedIds(new Set());
  }

  async function handleBulkFactCheck() {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      const result = selectedKeyword?.results.find(r => r.id === id);
      if (result?.status === 'PERSONA_DONE') {
        await handleGoStep3(id);
      }
    }
    setSelectedIds(new Set());
  }

  async function handleBulkDelete() {
    if (!window.confirm(`${selectedIds.size}件削除しますか？`)) return;
    for (const id of Array.from(selectedIds)) {
      await handleDeleteResult(id);
    }
    setSelectedIds(new Set());
  }

  function handleToggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleToggleAll(checked: boolean, visibleIds: string[]) {
    if (checked) setSelectedIds(new Set(visibleIds));
    else setSelectedIds(new Set());
  }

  // Stats (scoped to selected keyword)
  const kwResults = selectedKeyword?.results ?? [];
  const statsKwDone = kwResults.filter(r => ['KW_DONE', 'PERSONA_WIP', 'PERSONA_DONE', 'STRUCT_WIP', 'STRUCT_DONE', 'PUBLISHED'].includes(r.status)).length;
  const statsPersonaDone = kwResults.filter(r => ['PERSONA_DONE', 'STRUCT_WIP', 'STRUCT_DONE', 'PUBLISHED'].includes(r.status)).length;
  const statsStructDone = kwResults.filter(r => r.status === 'STRUCT_DONE' || r.status === 'PUBLISHED').length;

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
          {selectedTopLevel && <><span>›</span><span className="text-t2">{selectedTopLevel.name}</span></>}
          {selectedKeyword && <><span>›</span><span className="text-aC">{selectedKeyword.keyword}</span></>}
        </div>

        {/* Progress bar */}
        {(generatingId || busyIds.size > 0) && (
          <div className="h-[3px] bg-bg2 shrink-0 overflow-hidden">
            <div className="h-full w-1/3 bg-gradient-to-r from-aB via-aP to-aB animate-indeterminate" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Stats cards */}
          {selectedKeyword && (
            <div className="flex gap-2 mb-3">
              {[
                { label: t('statsTotal'), value: kwResults.length, color: 'text-t1' },
                { label: t('statsKwDone'), value: statsKwDone, color: 'text-aG' },
                { label: t('statsPersonaDone'), value: statsPersonaDone, color: 'text-aC' },
                { label: t('statsStructDone'), value: statsStructDone, color: 'text-aP' },
              ].map((s) => (
                <div key={s.label} className="flex-1 bg-bg1 border border-bd rounded-lg px-3 py-2">
                  <div className="text-tM text-[10px] font-mono uppercase tracking-wider mb-0.5">{s.label}</div>
                  <div className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</div>
                </div>
              ))}
            </div>
          )}

          {selectedKeyword && (
            <FlowSteps
              results={selectedKeyword.results}
              activeStep={filterStep}
              onStepClick={setFilterStep}
            />
          )}

          {selectedIds.size > 0 && (
            <BulkActions
              selectedCount={selectedIds.size}
              onNextStep={handleBulkNextStep}
              onGeneratePersona={handleBulkGeneratePersona}
              onFactCheck={handleBulkFactCheck}
              onDelete={handleBulkDelete}
            />
          )}

          {!selectedKeyword ? (
            <div className="text-center py-16 text-tM text-sm">
              <p>{t('topicSelectKeyword')}</p>
              <p className="text-xs mt-1 opacity-50">{t('topicSelectHint')}</p>
            </div>
          ) : (
            <ResultsTable
              results={selectedKeyword.results}
              isGenerating={generatingId === selectedKeyword.id}
              filterStep={filterStep}
              onUpdateResult={handleUpdateResult}
              onDeleteResult={handleDeleteResult}
              onSkip={handleSkip}
              onRestore={handleRestore}
              onGoStep2={handleGoStep2}
              onGoStep3={handleGoStep3}
              onRowClick={(r) => setDetailResult(r)}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onToggleAll={handleToggleAll}
            />
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {detailResult && (
        <DetailPanel
          result={detailResult}
          onClose={() => setDetailResult(null)}
          onUpdate={updateResultInState}
        />
      )}
    </div>
  );
}
