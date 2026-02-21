import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import type { TopLevel, Keyword, GeneratedResult } from '../types';
import { getTopLevels, createTopLevel, updateTopLevel, deleteTopLevel } from '../api/topics';
import { createKeyword, updateKeyword, deleteKeyword } from '../api/keywords';
import { updateResult, deleteResult } from '../api/results';
import { generateResults } from '../api/generate';
import TopicTree from '../components/topic/TopicTree';
import KeywordCard from '../components/topic/KeywordCard';
import ResultsTable from '../components/topic/ResultsTable';

export default function TopicCreator() {
  const [topLevels, setTopLevels] = useState<TopLevel[]>([]);
  const [selectedTopLevelId, setSelectedTopLevelId] = useState<string | null>(null);
  const [selectedKeywordId, setSelectedKeywordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadTopLevels();
  }, []);

  async function loadTopLevels() {
    try {
      const data = await getTopLevels();
      setTopLevels(data);
    } catch {
      toast.error('Failed to load topics');
    } finally {
      setLoading(false);
    }
  }

  const selectedTopLevel = topLevels.find((tl) => tl.id === selectedTopLevelId) ?? null;
  const selectedKeyword =
    selectedTopLevel?.keywords.find((kw) => kw.id === selectedKeywordId) ?? null;

  // TopLevel operations
  async function handleAddTopLevel(name: string) {
    try {
      const tl = await createTopLevel(name);
      setTopLevels((prev) => [...prev, tl]);
      setSelectedTopLevelId(tl.id);
      setSelectedKeywordId(null);
      toast.success('Topic created');
    } catch {
      toast.error('Failed to create topic');
    }
  }

  async function handleRenameTopLevel(id: string, name: string) {
    try {
      const updated = await updateTopLevel(id, name);
      setTopLevels((prev) => prev.map((tl) => (tl.id === id ? { ...tl, ...updated } : tl)));
    } catch {
      toast.error('Failed to rename topic');
    }
  }

  async function handleDeleteTopLevel(id: string) {
    try {
      await deleteTopLevel(id);
      setTopLevels((prev) => prev.filter((tl) => tl.id !== id));
      if (selectedTopLevelId === id) {
        setSelectedTopLevelId(null);
        setSelectedKeywordId(null);
      }
      toast.success('Topic deleted');
    } catch {
      toast.error('Failed to delete topic');
    }
  }

  // Keyword operations
  async function handleAddKeyword(topLevelId: string) {
    const keyword = window.prompt('Enter keyword:');
    if (!keyword?.trim()) return;
    try {
      const kw = await createKeyword({ topLevelId, keyword: keyword.trim() });
      setTopLevels((prev) =>
        prev.map((tl) =>
          tl.id === topLevelId ? { ...tl, keywords: [...tl.keywords, kw] } : tl
        )
      );
      setSelectedTopLevelId(topLevelId);
      setSelectedKeywordId(kw.id);
      toast.success('Keyword added');
    } catch {
      toast.error('Failed to add keyword');
    }
  }

  async function handleUpdateKeyword(
    id: string,
    data: { keyword?: string; goal?: string; audience?: string }
  ) {
    try {
      const updated = await updateKeyword(id, data);
      setTopLevels((prev) =>
        prev.map((tl) => ({
          ...tl,
          keywords: tl.keywords.map((kw) =>
            kw.id === id ? { ...kw, ...updated } : kw
          ),
        }))
      );
    } catch {
      toast.error('Failed to update keyword');
    }
  }

  async function handleDeleteKeyword(id: string) {
    try {
      await deleteKeyword(id);
      setTopLevels((prev) =>
        prev.map((tl) => ({ ...tl, keywords: tl.keywords.filter((kw) => kw.id !== id) }))
      );
      if (selectedKeywordId === id) setSelectedKeywordId(null);
      toast.success('Keyword deleted');
    } catch {
      toast.error('Failed to delete keyword');
    }
  }

  // Result operations
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
      toast.error('Failed to update result');
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
      toast.success('Result deleted');
    } catch {
      toast.error('Failed to delete result');
    }
  }

  async function handleGenerate(keywordId: string) {
    setGenerating(true);
    try {
      const newResults = await generateResults(keywordId);
      setTopLevels((prev) =>
        prev.map((tl) => ({
          ...tl,
          keywords: tl.keywords.map((kw) =>
            kw.id === keywordId
              ? { ...kw, results: [...newResults, ...kw.results] }
              : kw
          ),
        }))
      );
      toast.success(`Generated ${newResults.length} new results`);
    } catch {
      toast.error('Failed to generate results');
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-t2 text-sm">
        Loading topics…
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar tree */}
      <TopicTree
        topLevels={topLevels}
        selectedTopLevelId={selectedTopLevelId}
        selectedKeywordId={selectedKeywordId}
        onSelectTopLevel={(id) => { setSelectedTopLevelId(id); setSelectedKeywordId(null); }}
        onSelectKeyword={(tlId, kwId) => { setSelectedTopLevelId(tlId); setSelectedKeywordId(kwId); }}
        onRenameTopLevel={handleRenameTopLevel}
        onDeleteTopLevel={handleDeleteTopLevel}
        onAddTopLevel={handleAddTopLevel}
        onAddKeyword={handleAddKeyword}
        onDeleteKeyword={handleDeleteKeyword}
      />

      {/* Main editor area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-bg0">
        {/* Breadcrumb */}
        <div className="h-8 border-b border-bd flex items-center px-4 gap-2 shrink-0">
          {selectedTopLevel ? (
            <>
              <span className="text-t2 text-xs">{selectedTopLevel.name}</span>
              {selectedKeyword && (
                <>
                  <span className="text-tM text-xs">›</span>
                  <span className="text-t1 text-xs">{selectedKeyword.keyword}</span>
                </>
              )}
            </>
          ) : (
            <span className="text-tM text-xs">Select a topic from the sidebar</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!selectedTopLevel && (
            <div className="text-center py-20">
              <div className="text-4xl mb-4">📋</div>
              <h2 className="text-t1 text-lg font-medium mb-2">Topic Creator</h2>
              <p className="text-t2 text-sm mb-6">
                Manage top-level topics, keywords, and AI-generated content ideas
              </p>
              <button
                onClick={() => {
                  const name = window.prompt('New topic name:');
                  if (name?.trim()) handleAddTopLevel(name.trim());
                }}
                className="px-4 py-2 bg-aB hover:bg-blue-400 text-bg0 text-sm rounded transition-colors"
              >
                + Create First Topic
              </button>
            </div>
          )}

          {selectedTopLevel && !selectedKeyword && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-t1 font-medium">{selectedTopLevel.name}</h2>
                <button
                  onClick={() => handleAddKeyword(selectedTopLevel.id)}
                  className="px-3 py-1.5 bg-bg2 hover:bg-bd text-t1 text-xs rounded border border-bd transition-colors"
                >
                  + Add Keyword
                </button>
              </div>

              {selectedTopLevel.keywords.length === 0 ? (
                <p className="text-tM text-sm">No keywords yet — add one to get started.</p>
              ) : (
                <div className="space-y-2">
                  {selectedTopLevel.keywords.map((kw) => (
                    <div
                      key={kw.id}
                      onClick={() => setSelectedKeywordId(kw.id)}
                      className="flex items-center gap-3 px-4 py-3 bg-bg1 border border-bd rounded-lg cursor-pointer hover:border-t2 transition-colors"
                    >
                      <span className="text-tM text-xs">⌗</span>
                      <span className="text-t1 text-sm flex-1">{kw.keyword}</span>
                      <span className="text-tM text-xs">{kw.results.length} results</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedKeyword && (
            <div className="space-y-4">
              <KeywordCard
                keyword={selectedKeyword}
                onUpdate={handleUpdateKeyword}
                onGenerate={handleGenerate}
                generating={generating}
              />
              <div>
                <h3 className="text-t2 text-xs uppercase tracking-wider mb-3">Generated Results</h3>
                <ResultsTable
                  results={selectedKeyword.results}
                  onUpdateResult={handleUpdateResult}
                  onDeleteResult={handleDeleteResult}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
