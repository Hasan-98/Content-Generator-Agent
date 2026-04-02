import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { TopLevel, GeneratedResult, Article } from '../types';
import { getTopLevels } from '../api/topics';
import { generateArticle } from '../api/generate';
import { generateImagesBulk } from '../api/generate';
import { getArticle } from '../api/articles';
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
      const newArticle = await generateArticle(selectedResult.id);
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
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="text-4xl mb-3">📝</div>
              <div className="text-sm text-t2 mb-2">{selectedResult.title}</div>
              <p className="text-xs text-tM mb-4">記事がまだ生成されていません</p>
              <button
                onClick={handleGenerateArticle}
                disabled={generatingArticle}
                className="px-6 py-2.5 rounded-lg bg-aB/20 text-aB border border-aB/40 hover:bg-aB/30 disabled:opacity-50 transition-colors font-medium text-sm"
              >
                {generatingArticle ? t('articleGenerating') : t('articleGenerateBtn')}
              </button>
            </div>
          ) : phase === 'edit' ? (
            <ArticleEditor
              article={article}
              result={selectedResult}
              onArticleUpdate={setArticle}
              onNext={() => setPhase('image')}
              onOpenRef={() => setRefResult(selectedResult)}
            />
          ) : phase === 'image' ? (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="px-5 py-3 border-b border-bd flex items-center gap-3 shrink-0 bg-bg1">
                <button onClick={() => setPhase('edit')} className="text-xs text-t2 hover:text-t1 transition-colors">
                  {t('articleBackToEdit')}
                </button>
                <div className="flex-1" />
                <button
                  onClick={handleGenerateAllImages}
                  disabled={generatingAllImages}
                  className="text-xs px-3 py-1.5 rounded border border-aP/50 text-aP hover:bg-aP/10 disabled:opacity-50 transition-colors"
                >
                  {generatingAllImages ? '生成中…' : t('imageGenAllBtn')}
                </button>
                <button
                  onClick={() => setPhase('upload')}
                  className="text-xs px-3 py-1.5 rounded bg-aG/20 text-aG border border-aG/40 hover:bg-aG/30 transition-colors font-medium"
                >
                  {t('articleNextToUpload')}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {article.images.map((image) => {
                  const section = article.sections.find(s => s.index === image.index);
                  return (
                    <ImageCard
                      key={image.id}
                      image={image}
                      sectionHeading={section?.heading ?? `Section ${image.index + 1}`}
                      sectionType={section?.type ?? 'intro'}
                      articleId={article.id}
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
    </div>
  );
}
