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
      {/* Sidebar */}
      <div className="w-72 bg-bg1 border-r border-bd flex flex-col overflow-hidden shrink-0">
        <div className="h-8 border-b border-bd flex items-center px-3 shrink-0">
          <span className="text-[11px] font-mono text-tM uppercase tracking-wider">Instagram Publisher</span>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
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
                <div key={tl.id}>
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-aO uppercase tracking-wider">
                    {tl.name}
                  </div>
                  {tl.keywords.map(kw => {
                    const kwItems = tlItems.filter(i => i.kw.id === kw.id);
                    if (kwItems.length === 0) return null;
                    return (
                      <div key={kw.id}>
                        <div className="px-4 py-1 text-[11px] text-t2 font-mono truncate">{kw.keyword}</div>
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
                              className={`mx-2 mb-1 rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                                isSelected ? 'bg-aP/15 border border-aP/40' : 'bg-bg0 border border-bd hover:border-aP/30 hover:bg-bg2'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <span className="w-2 h-2 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: color }} />
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-t1 leading-snug line-clamp-2 mb-1">{result.title}</div>
                                  <span
                                    className="text-[10px] px-1.5 py-0.5 rounded-full"
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
                    );
                  })}
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
