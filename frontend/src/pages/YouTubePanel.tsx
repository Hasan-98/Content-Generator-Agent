import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import type { TopLevel, GeneratedResult, Article } from '../types';
import { getTopLevels } from '../api/topics';
import { getArticle } from '../api/articles';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const YT_STATUS_COLOR: Record<string, string> = {
  IMAGE_DONE: '#3fb950',
  UPLOADED:   '#ff0000',
};

const YT_TITLE_MAX = 100;
const YT_DESC_MAX  = 5000;
type YtPrivacy = 'public' | 'unlisted' | 'private';

function buildDescription(result: GeneratedResult, article: Article, chaptersLabel: string): string {
  const intro = article.sections.find(s => s.type === 'intro');
  const body = article.sections.filter(s => s.type !== 'intro');
  let desc = `${result.title}\n\n`;
  if (intro) desc += `${intro.content}\n\n`;
  desc += `― ${chaptersLabel} ―\n`;
  body.forEach((s, i) => { desc += `${i + 1}. ${s.heading}\n`; });
  desc += `\n#${result.keywordText.replace(/\s+/g, '')}`;
  return desc.slice(0, YT_DESC_MAX);
}

export default function YouTubePanel() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [topLevels, setTopLevels] = useState<TopLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<GeneratedResult | null>(null);
  const [article, setArticle] = useState<Article | null>(null);
  const [loadingArticle, setLoadingArticle] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDesc, setVideoDesc] = useState('');
  const [tags, setTags] = useState('');
  const [privacy, setPrivacy] = useState<YtPrivacy>('private');
  const [videoFile, setVideoFile] = useState<{ name: string; size: number; url: string } | null>(null);
  const [thumbnail, setThumbnail] = useState<{ name: string; url: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [collapsedTL, setCollapsedTL] = useState<Set<string>>(new Set());
  const [collapsedKW, setCollapsedKW] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  function toggleTL(id: string) {
    setCollapsedTL(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleKW(id: string) {
    setCollapsedKW(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function collapseAll() {
    setCollapsedTL(new Set(topLevels.map(tl => tl.id)));
    setCollapsedKW(new Set(topLevels.flatMap(tl => tl.keywords.map(k => k.id))));
  }

  useEffect(() => {
    getTopLevels()
      .then(setTopLevels)
      .catch(() => toast.error('Failed to load topics'))
      .finally(() => setLoading(false));
  }, [user?.id]);

  async function handleSelect(result: GeneratedResult) {
    setSelectedResult(result);
    setArticle(null);
    setVideoFile(null);
    setThumbnail(null);
    if (result.article?.id) {
      setLoadingArticle(true);
      try {
        const full = await getArticle(result.article.id);
        setArticle(full);
        setVideoTitle(result.title.slice(0, YT_TITLE_MAX));
        setVideoDesc(buildDescription(result, full, t('ytChapters')));
        setTags(result.keywordText);
      } catch {
        toast.error(t('ytErrorLoadArticle'));
      } finally {
        setLoadingArticle(false);
      }
    }
  }

  function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('video/')) {
      toast.error(t('ytErrorNotVideo'));
      return;
    }
    setVideoFile({ name: f.name, size: f.size, url: URL.createObjectURL(f) });
    e.target.value = '';
  }

  function handleThumbChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      toast.error(t('ytErrorNotImage'));
      return;
    }
    setThumbnail({ name: f.name, url: URL.createObjectURL(f) });
    e.target.value = '';
  }

  async function handleUpload() {
    if (!selectedResult || !article) return;
    if (!videoFile) {
      toast.error(t('ytErrorNoVideo'));
      return;
    }
    if (videoTitle.length === 0) {
      toast.error(t('ytErrorNoTitle'));
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    try {
      // Simulated upload progress — backend route to be wired later.
      for (let p = 10; p <= 100; p += 10) {
        await new Promise(r => setTimeout(r, 120));
        setUploadProgress(p);
      }
      toast.success(t('ytQueuedToast'));
    } catch {
      toast.error(t('ytUploadFailed'));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  const ytItems = topLevels.flatMap(tl =>
    tl.keywords.flatMap(kw =>
      kw.results
        .filter(r => {
          const st = r.article?.status;
          return st === 'IMAGE_DONE' || st === 'UPLOADED';
        })
        .map(r => ({ tl, kw, result: r }))
    )
  );

  const coverImage = article?.images.find(i => i.enabled && i.imageUrl);
  const titleLeft = YT_TITLE_MAX - videoTitle.length;
  const descLeft  = YT_DESC_MAX  - videoDesc.length;

  return (
    <div className="flex flex-1 overflow-hidden">
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
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-0'} bg-bg1 border-r border-bd flex flex-col overflow-hidden shrink-0 transition-[width] duration-150`}>
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-bd">
          <span className="text-t2 text-[11px] font-semibold uppercase tracking-widest">{t('ytPanelHeader')}</span>
          <div className="flex gap-1 items-center">
            <span className="text-[10px] text-tM mr-1">{ytItems.length}</span>
            <button
              onClick={collapseAll}
              title="Collapse all"
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

        <div className="flex-1 overflow-y-auto py-1">
          {loading ? (
            <div className="text-center py-8 text-xs text-tM">Loading…</div>
          ) : ytItems.length === 0 ? (
            <div className="text-center py-8 px-4">
              <p className="text-xs text-tM">{t('ytEmptyTitle')}</p>
              <p className="text-[11px] text-tM/60 mt-1">{t('ytEmptyHint')}</p>
            </div>
          ) : (
            topLevels.map(tl => {
              const tlItems = ytItems.filter(i => i.tl.id === tl.id);
              if (tlItems.length === 0) return null;
              return (
                <div key={tl.id} className="mb-0.5">
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
                      {tlItems.length}
                    </span>
                  </div>

                  {!collapsedTL.has(tl.id) && (
                    <div className="relative ml-6">
                      <div className="absolute left-0 top-0 bottom-0 w-px bg-bd" />
                      {tl.keywords.map(kw => {
                        const kwItems = tlItems.filter(i => i.kw.id === kw.id);
                        if (kwItems.length === 0) return null;
                        const isKWExpanded = !collapsedKW.has(kw.id);
                        const isAnySelected = kwItems.some(i => i.result.id === selectedResult?.id);
                        return (
                          <div
                            key={kw.id}
                            className={`mx-3 my-1 bg-bg0 border rounded-lg overflow-hidden transition-all ${
                              isAnySelected ? 'border-aR/40 shadow-[0_0_0_1px_rgba(248,81,73,0.1)]' : 'border-bd'
                            }`}
                          >
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
                              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-full bg-aR/15 text-aR shrink-0">
                                {kwItems.length}
                              </span>
                            </div>

                            {isKWExpanded && (
                              <div className="px-2.5 pb-2.5 space-y-1.5">
                                {kwItems.map(({ result }) => {
                                  const st = result.article?.status ?? 'IMAGE_DONE';
                                  const color = YT_STATUS_COLOR[st] ?? '#8b949e';
                                  const isSelected = result.id === selectedResult?.id;
                                  return (
                                    <div
                                      key={result.id}
                                      onClick={() => handleSelect(result)}
                                      className={`rounded-md px-2.5 py-2 cursor-pointer transition-all ${
                                        isSelected
                                          ? 'bg-aR/10 border border-aR/30'
                                          : 'bg-bg1 border border-bd hover:border-aR/30 hover:bg-bg2'
                                      }`}
                                    >
                                      <div className="flex items-start gap-2">
                                        <span className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ backgroundColor: color }} />
                                        <div className="flex-1 min-w-0">
                                          <div className="text-xs text-t1 leading-snug line-clamp-2 mb-1">{result.title}</div>
                                          <span
                                            className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                                            style={{ background: `${color}22`, color }}
                                          >
                                            {st}
                                          </span>
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
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden bg-bg0">
        <div className="h-8 border-b border-bd flex items-center px-4 gap-1.5 shrink-0 font-mono text-[11px] text-tM">
          <span>workspace</span>
          <span>›</span>
          <span className="text-t2">{t('ytPanelHeader')}</span>
          {selectedResult && <><span>›</span><span className="text-aR truncate max-w-xs">{selectedResult.title}</span></>}
        </div>

        {!selectedResult ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="currentColor" className="text-tM mb-4">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
            <p className="text-sm text-tM">{t('ytSelectTitle')}</p>
            <p className="text-xs text-tM/60 mt-1">{t('ytSelectHint')}</p>
          </div>
        ) : loadingArticle ? (
          <div className="flex-1 flex items-center justify-center text-t2 text-sm">{t('appLoading')}</div>
        ) : !article ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <p className="text-sm text-tM">{t('ytArticleNotFound')}</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto space-y-4">
              {/* Video upload */}
              <div className="bg-bg1 border border-bd rounded-xl p-4">
                <div className="text-xs font-semibold text-t2 uppercase tracking-wider mb-3">{t('ytVideoFile')}</div>
                <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoChange} />
                {!videoFile ? (
                  <button
                    onClick={() => videoInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-bd hover:border-aR/50 rounded-lg py-10 flex flex-col items-center justify-center gap-2 transition-colors group"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 text-tM group-hover:text-aR transition-colors">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span className="text-sm text-t2 group-hover:text-t1 transition-colors">{t('ytVideoUpload')}</span>
                    <span className="text-[11px] text-tM">{t('ytVideoFormats')}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <video src={videoFile.url} className="w-40 aspect-video rounded border border-bd object-cover bg-bg0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-t1 font-medium truncate">{videoFile.name}</div>
                      <div className="text-[11px] text-tM mt-0.5">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</div>
                      <button
                        onClick={() => setVideoFile(null)}
                        className="mt-2 text-[11px] text-tM hover:text-aR transition-colors"
                      >
                        {t('ytDelete')}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Thumbnail */}
              <div className="bg-bg1 border border-bd rounded-xl p-4">
                <div className="text-xs font-semibold text-t2 uppercase tracking-wider mb-3">{t('ytThumbnail')}</div>
                <input ref={thumbInputRef} type="file" accept="image/*" className="hidden" onChange={handleThumbChange} />
                <div className="flex items-center gap-3">
                  {thumbnail ? (
                    <img src={thumbnail.url} alt="thumb" className="w-40 aspect-video object-cover rounded border border-bd" />
                  ) : coverImage ? (
                    <img src={coverImage.imageUrl!} alt="cover" className="w-40 aspect-video object-cover rounded border border-bd opacity-70" />
                  ) : (
                    <div className="w-40 aspect-video rounded border border-bd bg-bg0 flex items-center justify-center text-[11px] text-tM">
                      {t('ytNoImage')}
                    </div>
                  )}
                  <div>
                    <button
                      onClick={() => thumbInputRef.current?.click()}
                      className="px-3 py-1.5 text-xs bg-bg0 border border-bd rounded hover:border-aR/50 hover:text-aR transition-colors"
                    >
                      {thumbnail ? t('ytChangeThumb') : t('ytCustomThumb')}
                    </button>
                    {thumbnail && (
                      <button
                        onClick={() => setThumbnail(null)}
                        className="ml-2 text-[11px] text-tM hover:text-aR transition-colors"
                      >
                        {t('ytDelete')}
                      </button>
                    )}
                    <p className="text-[11px] text-tM mt-2 leading-relaxed">{t('ytThumbHint')}</p>
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="bg-bg1 border border-bd rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-t2 uppercase tracking-wider">{t('ytTitle')}</span>
                  <span className={`text-[11px] font-mono ${titleLeft < 0 ? 'text-aR' : titleLeft < 10 ? 'text-aO' : 'text-tM'}`}>
                    {titleLeft}/{YT_TITLE_MAX}
                  </span>
                </div>
                <input
                  type="text"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  className="w-full bg-bg0 border border-bd rounded-md px-3 py-2 text-sm text-t1 focus:border-aR/60 focus:outline-none"
                />
              </div>

              {/* Description */}
              <div className="bg-bg1 border border-bd rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-t2 uppercase tracking-wider">{t('ytDescription')}</span>
                  <span className={`text-[11px] font-mono ${descLeft < 0 ? 'text-aR' : 'text-tM'}`}>
                    {videoDesc.length}/{YT_DESC_MAX}
                  </span>
                </div>
                <textarea
                  value={videoDesc}
                  onChange={(e) => setVideoDesc(e.target.value)}
                  rows={8}
                  className="w-full bg-bg0 border border-bd rounded-md p-3 text-sm text-t1 leading-relaxed focus:border-aR/60 focus:outline-none resize-none font-mono"
                />
              </div>

              {/* Tags + privacy */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-bg1 border border-bd rounded-xl p-4">
                  <div className="text-xs font-semibold text-t2 uppercase tracking-wider mb-2">{t('ytTags')}</div>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder={t('ytTagsPlaceholder')}
                    className="w-full bg-bg0 border border-bd rounded-md px-3 py-2 text-sm text-t1 focus:border-aR/60 focus:outline-none"
                  />
                </div>
                <div className="bg-bg1 border border-bd rounded-xl p-4">
                  <div className="text-xs font-semibold text-t2 uppercase tracking-wider mb-2">{t('ytPrivacy')}</div>
                  <select
                    value={privacy}
                    onChange={(e) => setPrivacy(e.target.value as YtPrivacy)}
                    className="w-full bg-bg0 border border-bd rounded-md px-3 py-2 text-sm text-t1 focus:border-aR/60 focus:outline-none"
                  >
                    <option value="private">{t('ytPrivacyPrivate')}</option>
                    <option value="unlisted">{t('ytPrivacyUnlisted')}</option>
                    <option value="public">{t('ytPrivacyPublic')}</option>
                  </select>
                </div>
              </div>

              {/* Upload */}
              {uploading && (
                <div className="bg-bg1 border border-bd rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2 text-xs">
                    <span className="text-t2">{t('ytUploading')}</span>
                    <span className="font-mono text-tM">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-bg0 rounded-full overflow-hidden">
                    <div className="h-full bg-aR transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={uploading || !videoFile || titleLeft < 0 || descLeft < 0}
                className="w-full px-4 py-3 bg-aR text-white text-sm font-semibold rounded-lg hover:bg-aR/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
                {uploading ? `${t('ytUploading')} ${uploadProgress}%` : t('ytUploadBtn')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
