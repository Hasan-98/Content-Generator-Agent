import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import type { TopLevel, GeneratedResult, Article } from '../types';
import { getTopLevels } from '../api/topics';
import { getArticle } from '../api/articles';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const TW_STATUS_COLOR: Record<string, string> = {
  IMAGE_DONE: '#3fb950',
  UPLOADED:   '#1d9bf0',
};

const TW_MAX_LEN = 280;

function buildTweet(result: GeneratedResult, article: Article): string {
  const intro = article.sections.find(s => s.type === 'intro');
  const hashtag = `#${result.keywordText.replace(/\s+/g, '')}`;
  const summary = intro?.content?.slice(0, TW_MAX_LEN - result.title.length - hashtag.length - 6) || '';
  return `${result.title}\n\n${summary}\n\n${hashtag}`.trim();
}

export default function TwitterPanel() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [topLevels, setTopLevels] = useState<TopLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<GeneratedResult | null>(null);
  const [article, setArticle] = useState<Article | null>(null);
  const [loadingArticle, setLoadingArticle] = useState(false);
  const [tweetText, setTweetText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [collapsedTL, setCollapsedTL] = useState<Set<string>>(new Set());
  const [collapsedKW, setCollapsedKW] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [uploadedMedia, setUploadedMedia] = useState<{ name: string; url: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setUploadedMedia([]);
    if (result.article?.id) {
      setLoadingArticle(true);
      try {
        const full = await getArticle(result.article.id);
        setArticle(full);
        setTweetText(buildTweet(result, full));
      } catch {
        toast.error(t('twErrorLoadArticle'));
      } finally {
        setLoadingArticle(false);
      }
    }
  }

  function handleFileChoose() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (uploadedMedia.length + files.length > 4) {
      toast.error(t('twErrorMaxMedia'));
      return;
    }
    files.forEach(f => {
      const url = URL.createObjectURL(f);
      setUploadedMedia(prev => [...prev, { name: f.name, url }]);
    });
    e.target.value = '';
  }

  function removeMedia(idx: number) {
    setUploadedMedia(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleUpload() {
    if (!selectedResult || !article) return;
    if (tweetText.length === 0) {
      toast.error(t('twErrorEmpty'));
      return;
    }
    if (tweetText.length > TW_MAX_LEN) {
      toast.error(`${t('twTooLong')} (${tweetText.length}/${TW_MAX_LEN})`);
      return;
    }
    setUploading(true);
    try {
      // Backend route not yet implemented — staged for future API call.
      await new Promise(r => setTimeout(r, 800));
      toast.success(t('twQueuedToast'));
    } catch {
      toast.error(t('twUploadFailed'));
    } finally {
      setUploading(false);
    }
  }

  const twItems = topLevels.flatMap(tl =>
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
  const charsLeft = TW_MAX_LEN - tweetText.length;

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
          <span className="text-t2 text-[11px] font-semibold uppercase tracking-widest">{t('twPanelHeader')}</span>
          <div className="flex gap-1 items-center">
            <span className="text-[10px] text-tM mr-1">{twItems.length}</span>
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
          ) : twItems.length === 0 ? (
            <div className="text-center py-8 px-4">
              <p className="text-xs text-tM">{t('twEmptyTitle')}</p>
              <p className="text-[11px] text-tM/60 mt-1">{t('twEmptyHint')}</p>
            </div>
          ) : (
            topLevels.map(tl => {
              const tlItems = twItems.filter(i => i.tl.id === tl.id);
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
                              isAnySelected ? 'border-aB/40 shadow-[0_0_0_1px_rgba(88,166,255,0.1)]' : 'border-bd'
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
                              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-full bg-aB/15 text-aB shrink-0">
                                {kwItems.length}
                              </span>
                            </div>

                            {isKWExpanded && (
                              <div className="px-2.5 pb-2.5 space-y-1.5">
                                {kwItems.map(({ result }) => {
                                  const st = result.article?.status ?? 'IMAGE_DONE';
                                  const color = TW_STATUS_COLOR[st] ?? '#8b949e';
                                  const isSelected = result.id === selectedResult?.id;
                                  return (
                                    <div
                                      key={result.id}
                                      onClick={() => handleSelect(result)}
                                      className={`rounded-md px-2.5 py-2 cursor-pointer transition-all ${
                                        isSelected
                                          ? 'bg-aB/10 border border-aB/30'
                                          : 'bg-bg1 border border-bd hover:border-aB/30 hover:bg-bg2'
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
          <span className="text-t2">{t('twPanelHeader')}</span>
          {selectedResult && <><span>›</span><span className="text-aB truncate max-w-xs">{selectedResult.title}</span></>}
        </div>

        {!selectedResult ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="text-tM mb-4">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <p className="text-sm text-tM">{t('twSelectTitle')}</p>
            <p className="text-xs text-tM/60 mt-1">{t('twSelectHint')}</p>
          </div>
        ) : loadingArticle ? (
          <div className="flex-1 flex items-center justify-center text-t2 text-sm">{t('appLoading')}</div>
        ) : !article ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <p className="text-sm text-tM">{t('ytArticleNotFound')}</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto">
              {/* Tweet preview */}
              <div className="bg-bg1 border border-bd rounded-xl p-4 mb-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-aB to-aC flex items-center justify-center text-xs font-bold text-white shrink-0">
                    X
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-t1 mb-1">your_account <span className="text-tM font-normal">@you · now</span></div>
                    <p className="text-sm text-t1 whitespace-pre-wrap leading-relaxed mb-3">{tweetText}</p>
                    {uploadedMedia.length > 0 && (
                      <div className={`grid gap-1.5 rounded-2xl overflow-hidden border border-bd mb-3 ${
                        uploadedMedia.length === 1 ? 'grid-cols-1' :
                        uploadedMedia.length === 2 ? 'grid-cols-2' :
                        'grid-cols-2'
                      }`}>
                        {uploadedMedia.map((m, i) => (
                          <img key={i} src={m.url} alt={m.name} className="w-full aspect-video object-cover" />
                        ))}
                      </div>
                    )}
                    {uploadedMedia.length === 0 && coverImage && (
                      <img src={coverImage.imageUrl!} alt={selectedResult.title} className="w-full aspect-video object-cover rounded-2xl border border-bd mb-3" />
                    )}
                  </div>
                </div>
              </div>

              {/* Composer */}
              <div className="bg-bg1 border border-bd rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-t2 uppercase tracking-wider">{t('twTweetLabel')}</span>
                  <span className={`text-[11px] font-mono ${charsLeft < 0 ? 'text-aR' : charsLeft < 20 ? 'text-aO' : 'text-tM'}`}>
                    {charsLeft}/{TW_MAX_LEN}
                  </span>
                </div>
                <textarea
                  value={tweetText}
                  onChange={(e) => setTweetText(e.target.value)}
                  rows={5}
                  className="w-full bg-bg0 border border-bd rounded-md p-3 text-sm text-t1 leading-relaxed focus:border-aB/60 focus:outline-none resize-none"
                />

                {/* Media upload */}
                <div className="mt-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={handleFileChoose}
                      disabled={uploadedMedia.length >= 4}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-bg0 border border-bd rounded text-xs text-t2 hover:border-aB/50 hover:text-aB transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      {t('twAddMedia')}
                    </button>
                    <span className="text-[10px] text-tM">{uploadedMedia.length}/4</span>
                  </div>
                  {uploadedMedia.length > 0 && (
                    <div className="grid grid-cols-4 gap-1.5">
                      {uploadedMedia.map((m, i) => (
                        <div key={i} className="relative group">
                          <img src={m.url} alt={m.name} className="w-full aspect-square object-cover rounded border border-bd" />
                          <button
                            onClick={() => removeMedia(i)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-bg0/90 border border-bd text-tM hover:text-aR hover:border-aR/50 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleUpload}
                disabled={uploading || charsLeft < 0}
                className="w-full px-4 py-2.5 bg-aB text-white text-sm font-semibold rounded-full hover:bg-aB/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? t('twPosting') : t('twPostBtn')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
