import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import type { Article, GeneratedResult } from '../../types';
import { upsertUploadMeta } from '../../api/articles';
import { publish } from '../../api/publish';
import { getWpConfig } from '../../api/wpConfig';
import WpConfigModal from '../user/WpConfigModal';
import toast from 'react-hot-toast';

interface Props {
  article: Article;
  result: GeneratedResult;
  topLevelId: string;
  topicName: string;
  onArticleUpdate: (article: Article) => void;
  onBack: () => void;
}

type UploadTab = 'preview' | 'seo' | 'platform';
type Platform = 'wordpress' | 'shopify';
type PubStatus = 'PUBLISH' | 'DRAFT' | 'SCHEDULE';

export default function UploadPanel({ article, result, topLevelId, topicName, onArticleUpdate, onBack }: Props) {
  const { t } = useLanguage();
  const [tab, setTab] = useState<UploadTab>('seo');
  const [platform, setPlatform] = useState<Platform>('wordpress');
  const [pubStatus, setPubStatus] = useState<PubStatus>('PUBLISH');
  const [scheduleDate, setScheduleDate] = useState('');
  const [checks, setChecks] = useState([false, false, false, false]);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [postUrl, setPostUrl] = useState<string | null>(null);
  const [showWpConfig, setShowWpConfig] = useState(false);

  const meta = article.uploadMeta;
  const [slug, setSlug] = useState(meta?.slug ?? '');
  const [excerpt, setExcerpt] = useState(meta?.excerpt ?? '');
  const [tags, setTags] = useState(meta?.tags ?? '');
  const [category, setCategory] = useState(meta?.category ?? '');

  const totalChars = article.sections.reduce((sum, s) => sum + s.content.length, 0);
  const generatedImages = article.images.filter(i => i.imageUrl).length;
  const enabledImages = article.images.filter(i => i.enabled).length;

  async function handleSaveMeta() {
    try {
      const updated = await upsertUploadMeta(article.id, {
        slug, excerpt, tags, category,
        publishStatus: pubStatus,
        scheduleDate: pubStatus === 'SCHEDULE' ? scheduleDate : undefined,
      });
      onArticleUpdate({ ...article, uploadMeta: updated });
      toast.success(t('acctSaved'));
    } catch {
      toast.error(t('toastUpdateFailed'));
    }
  }

  async function handlePublish() {
    // Check if WordPress credentials exist for this topic
    if (platform === 'wordpress') {
      try {
        const config = await getWpConfig(topLevelId);
        if (!config) {
          setShowWpConfig(true);
          return;
        }
      } catch {
        setShowWpConfig(true);
        return;
      }
    }

    setPublishing(true);
    try {
      await handleSaveMeta();
      const res = await publish(article.id, platform);
      setPostUrl(res.postUrl);
      setPublished(true);
      toast.success(t('toastPublishDone'));
    } catch {
      toast.error(t('toastPublishFailed'));
    } finally {
      setPublishing(false);
    }
  }

  const allChecked = checks.every(Boolean);
  const canPublish = allChecked && platform;

  if (published) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="text-5xl mb-4">🎉</div>
        <div className="text-xl font-semibold text-t1 mb-2">{t('articlePublished')}</div>
        <div className="text-sm text-t2 mb-4">{t('articlePublishedMsg')}</div>
        {postUrl && (
          <a href={postUrl} target="_blank" rel="noopener noreferrer" className="text-aB text-sm hover:underline mb-6">
            {postUrl}
          </a>
        )}
        <button onClick={onBack} className="text-xs px-4 py-2 rounded border border-bd text-t2 hover:text-t1 transition-colors">
          {t('articleBackToImages')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="px-5 py-3 border-b border-bd flex items-center gap-3 shrink-0 bg-bg1">
        <button onClick={onBack} className="text-xs text-t2 hover:text-t1 transition-colors">
          {t('articleBackToImages')}
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-t1 font-semibold truncate">{result.title}</div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-2 px-5 py-3 border-b border-bd shrink-0 bg-bg1/50">
        {[
          { label: t('uploadStatsSection'), value: article.sections.length },
          { label: t('uploadStatsChars'), value: totalChars.toLocaleString() },
          { label: t('uploadStatsImagesGen'), value: `${generatedImages}/${article.images.length}` },
          { label: t('uploadStatsImagesEnabled'), value: enabledImages },
        ].map((s) => (
          <div key={s.label} className="flex-1 bg-bg1 border border-bd rounded px-3 py-2">
            <div className="text-[10px] text-tM uppercase">{s.label}</div>
            <div className="text-sm font-bold font-mono text-t1">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-bd shrink-0 px-2">
        {(['preview', 'seo', 'platform'] as UploadTab[]).map((tp) => (
          <button
            key={tp}
            onClick={() => setTab(tp)}
            className={`px-4 py-2 text-xs transition-colors ${
              tab === tp ? 'text-aB border-b-2 border-aB -mb-px' : 'text-t2 hover:text-t1'
            }`}
          >
            {tp === 'preview' ? t('uploadTabPreview') : tp === 'seo' ? t('uploadTabSeo') : t('uploadTabPlatform')}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {/* Preview */}
        {tab === 'preview' && (
          <div className="prose prose-invert max-w-none">
            {/* Title image — always show title text on the photo */}
            {(() => {
              const titleImg = article.images.find(im => im.index === 0 && im.enabled && im.imageUrl);
              if (titleImg) {
                return (
                  <div className="relative w-full rounded-lg mb-4 overflow-hidden" style={{ aspectRatio: '16/9' }}>
                    <img src={titleImg.imageUrl!} alt={result.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <h1 className="text-2xl font-bold text-white text-center px-8" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.9)' }}>{titleImg.overlayTitle || result.title}</h1>
                    </div>
                  </div>
                );
              }
              return <h1 className="text-xl font-bold text-t1 mb-4">{result.title}</h1>;
            })()}
            {article.sections.map((s, i) => {
              const img = article.images.find(im => im.index === i && im.enabled && im.imageUrl && im.index !== 0);
              return (
                <div key={s.id} className="mb-6">
                  {img && (
                    <img src={img.imageUrl!} alt={s.heading} className="w-full rounded-lg mb-3 object-contain bg-bg0" />
                  )}
                  <h2 className="text-base font-semibold text-t1 mb-2">{s.heading}</h2>
                  <p className="text-sm text-t2 leading-relaxed whitespace-pre-wrap">{s.content}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* SEO */}
        {tab === 'seo' && (
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="text-xs text-t2 mb-1 block">{t('uploadSlugLabel')}</label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full bg-bg0 border border-bd rounded px-3 py-2 text-sm text-t1 focus:outline-none focus:border-aB"
                placeholder="my-article-slug"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-t2">{t('uploadExcerptLabel')}</label>
                <span className="text-[10px] text-tM">{excerpt.length} {t('uploadExcerptChars')}</span>
              </div>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows={3}
                className="w-full bg-bg0 border border-bd rounded px-3 py-2 text-sm text-t1 resize-none focus:outline-none focus:border-aB"
              />
            </div>
            <div>
              <label className="text-xs text-t2 mb-1 block">{t('uploadTagsLabel')}</label>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full bg-bg0 border border-bd rounded px-3 py-2 text-sm text-t1 focus:outline-none focus:border-aB"
                placeholder="tag1, tag2, tag3"
              />
            </div>
            <div>
              <label className="text-xs text-t2 mb-1 block">{t('uploadCategoryLabel')}</label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-bg0 border border-bd rounded px-3 py-2 text-sm text-t1 focus:outline-none focus:border-aB"
              />
            </div>
            <button
              onClick={handleSaveMeta}
              className="px-4 py-2 rounded bg-aB/20 text-aB text-xs border border-aB/40 hover:bg-aB/30 transition-colors"
            >
              保存
            </button>
          </div>
        )}

        {/* Platform */}
        {tab === 'platform' && (
          <div className="max-w-lg space-y-5">
            {/* Platform selection */}
            <div>
              <div className="text-xs text-t2 mb-2">プラットフォーム</div>
              <div className="flex gap-3">
                {(['wordpress', 'shopify'] as Platform[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    className={`flex-1 rounded-lg p-3 border text-sm font-medium transition-colors ${
                      platform === p ? 'border-aB bg-aB/10 text-aB' : 'border-bd text-t2 hover:border-aB/50'
                    }`}
                  >
                    {p === 'wordpress' ? t('uploadPlatformWordPress') : t('uploadPlatformShopify')}
                  </button>
                ))}
              </div>
            </div>

            {/* Publish status pills */}
            <div>
              <div className="text-xs text-t2 mb-2">公開設定</div>
              <div className="flex gap-2">
                {([
                  { value: 'PUBLISH', label: t('uploadStatusPublish'), color: 'aG' },
                  { value: 'DRAFT', label: t('uploadStatusDraft'), color: 't2' },
                  { value: 'SCHEDULE', label: t('uploadStatusSchedule'), color: 'aO' },
                ] as { value: PubStatus; label: string; color: string }[]).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPubStatus(opt.value)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      pubStatus === opt.value
                        ? `bg-${opt.color}/20 border-${opt.color}/60 text-${opt.color}`
                        : 'border-bd text-t2 hover:border-t2'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {pubStatus === 'SCHEDULE' && (
              <div>
                <label className="text-xs text-t2 mb-1 block">{t('uploadScheduleDate')}</label>
                <input
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="bg-bg0 border border-bd rounded px-3 py-2 text-sm text-t1 focus:outline-none focus:border-aB"
                />
              </div>
            )}

            {/* Checklist */}
            <div>
              <div className="text-xs text-t2 mb-2">{t('uploadChecklist')}</div>
              <div className="space-y-2">
                {[
                  t('uploadCheck1'),
                  t('uploadCheck2'),
                  t('uploadCheck3'),
                  t('uploadCheck4'),
                ].map((label, i) => (
                  <label key={i} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={checks[i]}
                      onChange={(e) => {
                        const next = [...checks];
                        next[i] = e.target.checked;
                        setChecks(next);
                      }}
                      className="w-4 h-4 accent-aG cursor-pointer"
                    />
                    <span className={`text-xs ${checks[i] ? 'text-t2 line-through' : 'text-t1'} group-hover:text-t1 transition-colors`}>
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Publish button */}
            <button
              onClick={handlePublish}
              disabled={!canPublish || publishing}
              className="w-full py-2.5 rounded-lg text-sm font-semibold bg-aG/20 text-aG border border-aG/40 hover:bg-aG/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {publishing ? t('detailGenerating') : t('uploadPublishBtn')}
            </button>

          </div>
        )}
      </div>

      {showWpConfig && (
        <WpConfigModal
          topLevelId={topLevelId}
          topicName={topicName}
          onClose={() => setShowWpConfig(false)}
        />
      )}
    </div>
  );
}
