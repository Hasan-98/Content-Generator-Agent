import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { TopLevel, GeneratedResult, Article } from '../types';
import { getTopLevels } from '../api/topics';
import { getArticle } from '../api/articles';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const IG_STATUS_COLOR: Record<string, string> = {
  IMAGE_DONE: '#3fb950',
  UPLOADED:   '#bc8cff',
};
const IG_STATUS_LABEL_KEY: Record<string, string> = {
  IMAGE_DONE: 'articleStatusImageDone',
  UPLOADED:   'articleStatusUploaded',
};

function buildCaption(result: GeneratedResult, article: Article): string {
  const sections = article.sections;
  const intro = sections.find(s => s.type === 'intro');
  const body = sections.filter(s => s.type !== 'intro').slice(0, 3);

  let caption = `✨ ${result.title}\n\n`;
  if (intro) caption += `${intro.content}\n\n`;
  body.forEach(s => {
    caption += `▶ ${s.heading}\n${s.content.slice(0, 80)}…\n\n`;
  });
  if (result.structH2) caption += `🔑 ${result.structH2}\n\n`;
  caption += `#${result.keywordText.replace(/\s+/g, '')}`;
  return caption;
}

export default function InstagramPanel() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [topLevels, setTopLevels] = useState<TopLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<GeneratedResult | null>(null);
  const [article, setArticle] = useState<Article | null>(null);
  const [loadingArticle, setLoadingArticle] = useState(false);
  const [copied, setCopied] = useState(false);
  const [collapsedTL, setCollapsedTL] = useState<Set<string>>(new Set());
  const [collapsedKW, setCollapsedKW] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    getTopLevels()
      .then(setTopLevels)
      .catch(() => toast.error('Failed to load topics'))
      .finally(() => setLoading(false));
  }, [user?.id]);

  async function handleSelect(result: GeneratedResult) {
    setSelectedResult(result);
    setArticle(null);
    setCopied(false);
    if (result.article?.id) {
      setLoadingArticle(true);
      try {
        const full = await getArticle(result.article.id);
        setArticle(full);
      } catch {
        toast.error('記事の読み込みに失敗しました');
      } finally {
        setLoadingArticle(false);
      }
    }
  }

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('キャプションをコピーしました');
    } catch {
      toast.error('コピーに失敗しました');
    }
  }

  // Items whose article status is IMAGE_DONE or UPLOADED
  const igItems = topLevels.flatMap(tl =>
    tl.keywords.flatMap(kw =>
      kw.results
        .filter(r => {
          const st = r.article?.status;
          return st === 'IMAGE_DONE' || st === 'UPLOADED';
        })
        .map(r => ({ tl, kw, result: r }))
    )
  );

  const caption = selectedResult && article ? buildCaption(selectedResult, article) : '';
  const coverImage = article?.images.find(i => i.enabled && i.imageUrl);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar — matches Topic/Article tree style */}
      <div className="w-80 bg-bg1 border-r border-bd flex flex-col overflow-hidden shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-bd">
          <span className="text-t2 text-[11px] font-semibold uppercase tracking-widest">Instagram Publisher</span>
          <div className="flex gap-1 items-center">
            <span className="text-[10px] text-tM mr-1">{igItems.length}</span>
            <button
              onClick={collapseAll}
              title="Collapse all"
              className="w-6 h-6 flex items-center justify-center rounded text-tM hover:bg-bg2 hover:text-t1 transition-colors border-0 bg-transparent"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[17px] h-[17px]">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-y-auto py-1">
          {loading ? (
            <div className="text-center py-8 text-xs text-tM">Loading…</div>
          ) : igItems.length === 0 ? (
            <div className="text-center py-8 px-4">
              <p className="text-xs text-tM">投稿可能な記事がありません</p>
              <p className="text-[11px] text-tM/60 mt-1">画像生成済みの記事がここに表示されます</p>
            </div>
          ) : (
            topLevels.map(tl => {
              const tlItems = igItems.filter(i => i.tl.id === tl.id);
              if (tlItems.length === 0) return null;
              return (
                <div key={tl.id} className="mb-0.5">
                  {/* TopLevel row */}
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
                              isAnySelected ? 'border-aP/40 shadow-[0_0_0_1px_rgba(188,140,255,0.1)]' : 'border-bd'
                            }`}
                          >
                            {/* Keyword header */}
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
                              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-full bg-aP/15 text-aP shrink-0">
                                {kwItems.length}
                              </span>
                            </div>

                            {isKWExpanded && (
                              <div className="px-2.5 pb-2.5 space-y-1.5">
                                {kwItems.map(({ result }) => {
                                  const st = result.article?.status ?? 'IMAGE_DONE';
                                  const color = IG_STATUS_COLOR[st] ?? '#8b949e';
                                  const labelKey = IG_STATUS_LABEL_KEY[st];
                                  const label = labelKey ? t(labelKey as any) : st;
                                  const isSelected = result.id === selectedResult?.id;
                                  return (
                                    <div
                                      key={result.id}
                                      onClick={() => handleSelect(result)}
                                      className={`rounded-md px-2.5 py-2 cursor-pointer transition-all ${
                                        isSelected
                                          ? 'bg-aP/10 border border-aP/30'
                                          : 'bg-bg1 border border-bd hover:border-aP/30 hover:bg-bg2'
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
                                            {label}
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

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-bg0">
        {/* Breadcrumb */}
        <div className="h-8 border-b border-bd flex items-center px-4 gap-1.5 shrink-0 font-mono text-[11px] text-tM">
          <span>workspace</span>
          <span>›</span>
          <span className="text-t2">Instagram Publisher</span>
          {selectedResult && <><span>›</span><span className="text-aP truncate max-w-xs">{selectedResult.title}</span></>}
        </div>

        {!selectedResult ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-tM mb-4">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
            </svg>
            <p className="text-sm text-tM">左のサイドバーから記事を選択してください</p>
            <p className="text-xs text-tM/60 mt-1">画像生成済みの記事をInstagram用に投稿できます</p>
          </div>
        ) : loadingArticle ? (
          <div className="flex-1 flex items-center justify-center text-t2 text-sm">Loading…</div>
        ) : !article ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <p className="text-sm text-tM">記事データが見つかりません</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto">
              {/* Post preview */}
              <div className="bg-bg1 border border-bd rounded-xl overflow-hidden mb-5">
                {/* Header mock */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-bd">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-aP to-aO flex items-center justify-center text-xs font-bold text-white">
                    IG
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-t1">your_account</div>
                    <div className="text-[10px] text-tM">プレビュー</div>
                  </div>
                </div>

                {/* Image */}
                {coverImage ? (
                  <img
                    src={coverImage.imageUrl!}
                    alt={selectedResult.title}
                    className="w-full aspect-square object-cover"
                  />
                ) : (
                  <div className="w-full aspect-square bg-bg2 flex items-center justify-center">
                    <span className="text-xs text-tM">画像なし</span>
                  </div>
                )}

                {/* Caption */}
                <div className="px-4 py-3">
                  <p className="text-xs text-t1 whitespace-pre-wrap leading-relaxed">{caption}</p>
                </div>
              </div>

              {/* Caption editor */}
              <div className="bg-bg1 border border-bd rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-t2 uppercase tracking-wider">キャプション</span>
                  <button
                    onClick={() => handleCopy(caption)}
                    className={`text-xs px-3 py-1.5 rounded border transition-colors font-medium ${
                      copied
                        ? 'border-aG/60 bg-aG/10 text-aG'
                        : 'border-bd text-t2 hover:border-aP/50 hover:text-aP'
                    }`}
                  >
                    {copied ? '✓ コピー済み' : 'キャプションをコピー'}
                  </button>
                </div>
                <pre className="text-xs text-t1 whitespace-pre-wrap font-mono bg-bg0 rounded p-3 border border-bd leading-relaxed">
                  {caption}
                </pre>
              </div>

              {/* Image list */}
              {article.images.filter(i => i.enabled && i.imageUrl).length > 1 && (
                <div className="bg-bg1 border border-bd rounded-xl p-4">
                  <div className="text-xs font-semibold text-t2 uppercase tracking-wider mb-3">
                    全画像 ({article.images.filter(i => i.enabled && i.imageUrl).length}枚)
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {article.images
                      .filter(i => i.enabled && i.imageUrl)
                      .map(img => (
                        <img
                          key={img.id}
                          src={img.imageUrl!}
                          alt={`image-${img.index}`}
                          className="w-full aspect-square object-cover rounded-lg border border-bd"
                        />
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
