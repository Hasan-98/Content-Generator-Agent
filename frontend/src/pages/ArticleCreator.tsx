import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { TopLevel, GeneratedResult, Article } from '../types';
import { getTopLevels } from '../api/topics';
import { generateArticle, regenerateTitle } from '../api/generate';
import { generateImagesBulk } from '../api/generate';
import { getArticle, updateImage } from '../api/articles';
import { updateResult, deleteResult } from '../api/results';
import { IMEInput } from '../components/common/IMEInput';
import { listPromptTemplates } from '../api/promptTemplates';
import PromptTemplatesModal from '../components/modals/PromptTemplatesModal';
import PromptPicker from '../components/article/PromptPicker';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import ArticleTree from '../components/article/ArticleTree';
import ArticleEditor from '../components/article/ArticleEditor';
import ImageCard from '../components/article/ImageCard';
import UploadPanel from '../components/article/UploadPanel';
import ReferenceModal from '../components/modals/ReferenceModal';
import type { ArticleImage } from '../types';

type Phase = 'edit' | 'image' | 'upload';

export default function ArticleCreator() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [topLevels, setTopLevels] = useState<TopLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<GeneratedResult | null>(null);
  const [article, setArticle] = useState<Article | null>(null);
  const [phase, setPhase] = useState<Phase>('edit');
  const [generatingArticle, setGeneratingArticle] = useState(false);
  const [generatingAllImages, setGeneratingAllImages] = useState(false);
  const [refResult, setRefResult] = useState<GeneratedResult | null>(null);
  const [masterPrompt, setMasterPrompt] = useState('');
  const [applyingMaster, setApplyingMaster] = useState(false);
  const [regeneratingTitle, setRegeneratingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [promptTplModalOpen, setPromptTplModalOpen] = useState(false);
  const [promptTplInitialMode, setPromptTplInitialMode] = useState<'list' | 'create' | { editId: string }>('list');
  const [promptPickerRefresh, setPromptPickerRefresh] = useState(0);
  const [regenPickerOpen, setRegenPickerOpen] = useState(false);
  const [regenTemplateId, setRegenTemplateId] = useState<string>('');
  const [regeneratingArticle, setRegeneratingArticle] = useState(false);

  // Auto-pick the user's default template (if any) on first load
  useEffect(() => {
    listPromptTemplates()
      .then((tpls) => {
        const def = tpls.find((p) => p.isDefault);
        if (def) setSelectedTemplateId(def.id);
      })
      .catch(() => { /* silent — feature is optional */ });
  }, [promptPickerRefresh]);

  async function handleRegenerateArticle() {
    if (!selectedResult || !article) return;
    if (!confirm(t('articleRegenConfirm'))) return;
    setRegeneratingArticle(true);
    setRegenPickerOpen(false);
    toast.loading(t('toastArticleRegenerating'), { id: 'regen-article' });
    try {
      const newArticle = await generateArticle(selectedResult.id, regenTemplateId || undefined, true);
      setArticle(newArticle);
      setTopLevels(prev =>
        prev.map(tl => ({
          ...tl,
          keywords: tl.keywords.map(kw => ({
            ...kw,
            results: kw.results.map(r =>
              r.id === selectedResult.id ? { ...r, article: newArticle } : r
            ),
          })),
        }))
      );
      setSelectedResult(prev => prev ? { ...prev, article: newArticle } : prev);
      toast.success(t('toastArticleRegenDone'), { id: 'regen-article' });
    } catch {
      toast.error(t('toastArticleFailed'), { id: 'regen-article' });
    } finally {
      setRegeneratingArticle(false);
    }
  }

  async function handleCommitTitleEdit() {
    if (!selectedResult) return;
    setEditingTitle(false);
    const trimmed = titleDraft.trim();
    if (!trimmed || trimmed === selectedResult.title) return;
    try {
      const updated = await updateResult(selectedResult.id, { title: trimmed });
      setSelectedResult(updated);
      setTopLevels(prev =>
        prev.map(tl => ({
          ...tl,
          keywords: tl.keywords.map(kw => ({
            ...kw,
            results: kw.results.map(r => r.id === updated.id ? { ...r, ...updated } : r),
          })),
        }))
      );
      toast.success(t('toastTitleUpdated'));
    } catch {
      toast.error(t('toastUpdateFailed'));
    }
  }

  async function handleTreeRename(id: string, newTitle: string) {
    try {
      const updated = await updateResult(id, { title: newTitle });
      setTopLevels(prev =>
        prev.map(tl => ({
          ...tl,
          keywords: tl.keywords.map(kw => ({
            ...kw,
            results: kw.results.map(r => r.id === updated.id ? { ...r, ...updated } : r),
          })),
        }))
      );
      if (selectedResult?.id === id) setSelectedResult(prev => prev ? { ...prev, ...updated } : prev);
      toast.success(t('toastTitleUpdated'));
    } catch {
      toast.error(t('toastUpdateFailed'));
      throw new Error('rename failed');
    }
  }

  async function handleTreeDelete(id: string) {
    try {
      await deleteResult(id);
      setTopLevels(prev =>
        prev.map(tl => ({
          ...tl,
          keywords: tl.keywords.map(kw => ({
            ...kw,
            results: kw.results.filter(r => r.id !== id),
          })),
        }))
      );
      if (selectedResult?.id === id) {
        setSelectedResult(null);
        setArticle(null);
      }
      toast.success(t('toastResultDeleted'));
    } catch {
      toast.error(t('toastDeleteFailed'));
      throw new Error('delete failed');
    }
  }

  async function handleRegenTitle() {
    if (!selectedResult) return;
    setRegeneratingTitle(true);
    try {
      const updated = await regenerateTitle(selectedResult.id);
      setSelectedResult(updated);
      setTopLevels(prev =>
        prev.map(tl => ({
          ...tl,
          keywords: tl.keywords.map(kw => ({
            ...kw,
            results: kw.results.map(r => r.id === updated.id ? { ...r, ...updated } : r),
          })),
        }))
      );
      toast.success(t('toastTitleRegenDone'));
    } catch {
      toast.error(t('toastTitleRegenFailed'));
    } finally {
      setRegeneratingTitle(false);
    }
  }

  useEffect(() => {
    getTopLevels()
      .then(setTopLevels)
      .catch(() => toast.error(t('toastTopicLoadFailed')))
      .finally(() => setLoading(false));
  }, [user?.id]);

  async function handleSelectResult(result: GeneratedResult) {
    setSelectedResult(result);
    setPhase('edit');
    if (result.article?.id) {
      try {
        const fullArticle = await getArticle(result.article.id);
        setArticle(fullArticle);
      } catch {
        setArticle(null);
      }
    } else {
      setArticle(null);
    }
  }

  async function handleGenerateArticle() {
    if (!selectedResult) return;
    setGeneratingArticle(true);
    toast.loading(t('toastArticleGenerating'), { id: 'gen-article' });
    try {
      const newArticle = await generateArticle(selectedResult.id, selectedTemplateId || undefined);
      setArticle(newArticle);
      // Update result in topLevels to have article reference
      setTopLevels(prev =>
        prev.map(tl => ({
          ...tl,
          keywords: tl.keywords.map(kw => ({
            ...kw,
            results: kw.results.map(r =>
              r.id === selectedResult.id ? { ...r, article: newArticle } : r
            ),
          })),
        }))
      );
      setSelectedResult(prev => prev ? { ...prev, article: newArticle } : prev);
      toast.success(t('toastArticleDone'), { id: 'gen-article' });
    } catch {
      toast.error(t('toastArticleFailed'), { id: 'gen-article' });
    } finally {
      setGeneratingArticle(false);
    }
  }

  async function handleGenerateAllImages() {
    if (!article) return;
    setGeneratingAllImages(true);
    try {
      const updatedImages = await generateImagesBulk(article.id);
      setArticle(prev => {
        if (!prev) return prev;
        const imageMap = new Map(updatedImages.map((img: ArticleImage) => [img.index, img]));
        return {
          ...prev,
          images: prev.images.map(img => imageMap.get(img.index) ?? img),
        };
      });
      toast.success(t('toastImageGenDone'));
    } catch {
      toast.error(t('toastImageGenFailed'));
    } finally {
      setGeneratingAllImages(false);
    }
  }

  async function handleApplyMasterPrompt() {
    if (!article || !masterPrompt.trim()) return;
    setApplyingMaster(true);
    try {
      const updates = await Promise.all(
        article.images
          .filter(img => img.enabled)
          .map(img => updateImage(article.id, img.index, { prompt: masterPrompt }))
      );
      setArticle(prev => {
        if (!prev) return prev;
        const map = new Map(updates.map(u => [u.index, u]));
        return { ...prev, images: prev.images.map(img => map.get(img.index) ?? img) };
      });
      toast.success(t('imageMasterPromptApply'));
    } catch {
      toast.error(t('toastUpdateFailed'));
    } finally {
      setApplyingMaster(false);
    }
  }

  function handleImageUpdate(updatedImage: ArticleImage) {
    setArticle(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        images: prev.images.map(img => img.index === updatedImage.index ? updatedImage : img),
      };
    });
  }

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-t2 text-sm">{t('topicLoading')}</div>;
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <ArticleTree
        topLevels={topLevels}
        selectedResultId={selectedResult?.id ?? null}
        onSelect={handleSelectResult}
        onOpenRef={setRefResult}
        onRename={handleTreeRename}
        onDelete={handleTreeDelete}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-bg0">
        {/* Breadcrumb */}
        <div className="h-8 border-b border-bd flex items-center px-4 gap-1.5 shrink-0 font-mono text-[11px] text-tM">
          <span>workspace</span>
          <span>›</span>
          <span className="text-t2">{t('articleCreatorBreadcrumb')}</span>
          {selectedResult && <><span>›</span><span className="text-aC truncate max-w-xs">{selectedResult.title}</span></>}
        </div>

        {/* Step flow cards */}
        <div className="flex gap-2 px-4 pt-3 shrink-0">
          {[
            { step: t('articleStepA'), label: t('articleStepALabel'), phase: 'edit' as Phase, color: '#58a6ff' },
            { step: t('articleStepB'), label: t('articleStepBLabel'), phase: 'image' as Phase, color: '#bc8cff' },
            { step: t('articleStepC'), label: t('articleStepCLabel'), phase: 'upload' as Phase, color: '#3fb950' },
          ].map((s) => (
            <button
              key={s.phase}
              onClick={() => article && setPhase(s.phase)}
              disabled={!article}
              className={`flex-1 rounded-lg border px-3 py-2 text-left transition-all disabled:opacity-40 ${
                phase === s.phase ? 'bg-bg2' : 'bg-bg1 hover:bg-bg2'
              }`}
              style={{ borderTopWidth: 2, borderTopColor: s.color, borderColor: phase === s.phase ? s.color : undefined }}
            >
              <div className="text-xs font-mono font-semibold mb-0.5" style={{ color: s.color }}>{s.step}</div>
              <div className="text-xs text-t2">{s.label}</div>
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden mt-3">
          {!selectedResult ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="text-4xl mb-3">✍️</div>
              <p className="text-sm text-tM">{t('articleNoItems')}</p>
              <p className="text-xs text-tM/60 mt-1">{t('articleNoItemsHint')}</p>
            </div>
          ) : !article ? (
            <div className="h-full overflow-y-auto p-8">
              <div className="max-w-2xl mx-auto flex flex-col items-start">
                <div className="text-4xl mb-3">📝</div>
                <div className="text-sm text-t2 mb-2">{selectedResult.title}</div>
                <p className="text-xs text-tM mb-4">記事がまだ生成されていません</p>

                {/* Prompt template picker — card-based panel */}
                <div className="w-full mb-4">
                  <PromptPicker
                    selectedId={selectedTemplateId}
                    onSelect={setSelectedTemplateId}
                    onManage={(mode) => { setPromptTplInitialMode(mode ?? 'list'); setPromptTplModalOpen(true); }}
                    refreshKey={promptPickerRefresh}
                  />
                </div>

                <button
                  onClick={handleGenerateArticle}
                  disabled={generatingArticle}
                  className="px-6 py-2.5 rounded-lg bg-aB/20 text-aB border border-aB/40 hover:bg-aB/30 disabled:opacity-50 transition-colors font-medium text-sm"
                >
                  {generatingArticle ? t('articleGenerating') : t('articleGenerateBtn')}
                </button>
              </div>
            </div>
          ) : phase === 'edit' ? (
            <ArticleEditor
              article={article}
              result={selectedResult}
              onArticleUpdate={setArticle}
              onResultUpdate={(updated) => {
                setSelectedResult(updated);
                setTopLevels(prev =>
                  prev.map(tl => ({
                    ...tl,
                    keywords: tl.keywords.map(kw => ({
                      ...kw,
                      results: kw.results.map(r => r.id === updated.id ? { ...r, ...updated } : r),
                    })),
                  }))
                );
              }}
              onNext={() => setPhase('image')}
              onOpenRef={() => setRefResult(selectedResult)}
              onRegenerateArticle={() => { setRegenTemplateId(selectedTemplateId); setRegenPickerOpen(true); }}
              regeneratingArticle={regeneratingArticle}
            />
          ) : phase === 'image' ? (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="px-5 py-3 border-b border-bd flex items-center gap-3 shrink-0 bg-bg1">
                <button onClick={() => setPhase('edit')} className="text-xs text-t2 hover:text-t1 transition-colors">
                  {t('articleBackToEdit')}
                </button>
                <div className="flex-1 min-w-0 mx-3">
                  <div className="text-[11px] text-t2 font-mono truncate">{selectedResult.keywordText}</div>
                  <div className="flex items-center gap-2">
                    {editingTitle ? (
                      <IMEInput
                        autoFocus
                        value={titleDraft}
                        onValueChange={setTitleDraft}
                        onBlur={handleCommitTitleEdit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCommitTitleEdit();
                          if (e.key === 'Escape') { setEditingTitle(false); }
                        }}
                        className="flex-1 text-sm text-t1 font-semibold bg-bg0 border border-aB rounded px-2 py-0.5 focus:outline-none"
                      />
                    ) : (
                      <div
                        onClick={() => { setTitleDraft(selectedResult.title); setEditingTitle(true); }}
                        className="text-sm text-t1 font-semibold truncate cursor-text hover:text-aB transition-colors"
                        title={t('titleClickToEdit')}
                      >
                        {selectedResult.title}
                      </div>
                    )}
                    <button
                      onClick={handleRegenTitle}
                      disabled={regeneratingTitle}
                      className="shrink-0 text-[10px] px-2 py-0.5 rounded border border-aO/50 text-aO hover:bg-aO/10 disabled:opacity-50 transition-colors"
                      title={t('titleRegenTooltip')}
                    >
                      {regeneratingTitle ? '…' : t('titleRegenBtn')}
                    </button>
                  </div>
                </div>
                <div className="relative group">
                  <button
                    onClick={handleGenerateAllImages}
                    disabled={generatingAllImages}
                    className="text-xs px-3 py-1.5 rounded border border-aP/50 text-aP hover:bg-aP/10 disabled:opacity-50 transition-colors font-medium"
                  >
                    {generatingAllImages ? t('detailGenerating') : t('imageBulkGenBtn')}
                  </button>
                  <div className="absolute bottom-full right-0 mb-2 w-72 p-3 rounded-lg bg-bg2 border border-bd shadow-lg text-[11px] text-t2 leading-relaxed opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-30 whitespace-pre-line">
                    {t('imageBulkGenTooltip')}
                  </div>
                </div>
                <button
                  onClick={() => setPhase('upload')}
                  className="text-xs px-3 py-1.5 rounded bg-aG/20 text-aG border border-aG/40 hover:bg-aG/30 transition-colors font-medium"
                >
                  {t('articleNextToUpload')}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {/* Master prompt — auto-applies to every image box */}
                <div className="mb-4 rounded-lg border border-aP/40 bg-aP/5 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-aP font-medium">{t('imageMasterPromptLabel')}</span>
                    <button
                      onClick={handleApplyMasterPrompt}
                      disabled={applyingMaster || !masterPrompt.trim()}
                      className="text-[11px] px-3 py-1 rounded border border-aP/50 text-aP hover:bg-aP/20 disabled:opacity-40 transition-colors"
                    >
                      {applyingMaster ? '…' : t('imageMasterPromptApply')}
                    </button>
                  </div>
                  <textarea
                    value={masterPrompt}
                    onChange={(e) => setMasterPrompt(e.target.value)}
                    placeholder={t('imageMasterPromptPlaceholder')}
                    rows={2}
                    className="w-full bg-bg0 border border-bd rounded px-2 py-1.5 text-xs text-t1 resize-none focus:outline-none focus:border-aP"
                  />
                </div>
                {article.images.map((image) => {
                  const section = article.sections.find(s => s.index === image.index);
                  return (
                    <ImageCard
                      key={image.id}
                      image={image}
                      sectionHeading={section?.heading ?? `Section ${image.index + 1}`}
                      sectionType={section?.type ?? 'intro'}
                      articleId={article.id}
                      articleTitle={selectedResult.title}
                      onUpdate={handleImageUpdate}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <UploadPanel
              article={article}
              result={selectedResult}
              topLevelId={topLevels.find(tl => tl.keywords.some(k => k.id === selectedResult.keywordId))?.id ?? ''}
              topicName={topLevels.find(tl => tl.keywords.some(k => k.id === selectedResult.keywordId))?.name ?? ''}
              onArticleUpdate={setArticle}
              onBack={() => setPhase('image')}
            />
          )}
        </div>
      </div>

      {/* Reference Modal */}
      {refResult && (
        <ReferenceModal result={refResult} onClose={() => setRefResult(null)} />
      )}

      {/* Regenerate Article — pick a prompt template before regenerating */}
      {regenPickerOpen && selectedResult && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setRegenPickerOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-bg1 border border-bd rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-bd shrink-0">
              <div>
                <h2 className="text-sm font-semibold text-t1">{t('articleRegenModalTitle')}</h2>
                <p className="text-[11px] text-aR mt-0.5">{t('articleRegenWarning')}</p>
              </div>
              <button onClick={() => setRegenPickerOpen(false)} className="text-tM hover:text-t1 transition-colors text-xl leading-none">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <PromptPicker
                selectedId={regenTemplateId}
                onSelect={setRegenTemplateId}
                onManage={(mode) => { setRegenPickerOpen(false); setPromptTplInitialMode(mode ?? 'list'); setPromptTplModalOpen(true); }}
                refreshKey={promptPickerRefresh}
              />
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-bd shrink-0">
              <button
                onClick={() => setRegenPickerOpen(false)}
                className="text-[11px] px-3 py-1.5 rounded border border-bd text-t2 hover:text-t1 transition-colors"
              >
                {t('promptTplCancel')}
              </button>
              <button
                onClick={handleRegenerateArticle}
                disabled={regeneratingArticle}
                className="text-[11px] px-3 py-1.5 rounded bg-gradient-to-r from-aO to-aR text-white hover:opacity-90 disabled:opacity-50 transition-all font-semibold"
              >
                {regeneratingArticle ? t('articleRegenerating') : t('articleRegenConfirmBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Templates Modal */}
      {promptTplModalOpen && (
        <PromptTemplatesModal
          onClose={() => setPromptTplModalOpen(false)}
          initialMode={promptTplInitialMode}
          onChanged={(tpls) => {
            // If the currently selected template was deleted, fall back to the new default
            if (selectedTemplateId && !tpls.find((p) => p.id === selectedTemplateId)) {
              const def = tpls.find((p) => p.isDefault);
              setSelectedTemplateId(def?.id || '');
            }
            setPromptPickerRefresh((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}
