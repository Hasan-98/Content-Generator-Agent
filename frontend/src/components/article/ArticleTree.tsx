import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import type { TopLevel, GeneratedResult } from '../../types';
import WpConfigModal from '../user/WpConfigModal';
import ShopifyConfigModal from '../user/ShopifyConfigModal';

interface Props {
  topLevels: TopLevel[];
  selectedResultId: string | null;
  onSelect: (result: GeneratedResult) => void;
  onOpenRef: (result: GeneratedResult) => void;
}

const ARTICLE_STATUS_COLOR: Record<string, string> = {
  READY:        '#58a6ff',
  WRITING:      '#d29922',
  ARTICLE_DONE: '#39d2c0',
  IMAGING:      '#bc8cff',
  IMAGE_DONE:   '#3fb950',
  UPLOADED:     '#f85149',
};

const ARTICLE_STATUS_LABEL: Record<string, string> = {
  READY:        '未作成',
  WRITING:      '作成中',
  ARTICLE_DONE: '記事OK',
  IMAGING:      '画像生成中',
  IMAGE_DONE:   '画像OK',
  UPLOADED:     'アップ済',
};

export default function ArticleTree({ topLevels, selectedResultId, onSelect, onOpenRef }: Props) {
  const { t } = useLanguage();
  const [wpConfigTopic, setWpConfigTopic] = useState<{ id: string; name: string } | null>(null);
  const [shopifyConfigTopic, setShopifyConfigTopic] = useState<{ id: string; name: string } | null>(null);

  const articleItems = topLevels.flatMap((tl) =>
    tl.keywords.flatMap((kw) =>
      kw.results
        .filter((r) => r.status === 'STRUCT_DONE' || r.status === 'PUBLISHED')
        .map((r) => ({ tl, kw, result: r }))
    )
  );

  return (
    <div className="w-72 bg-bg1 border-r border-bd flex flex-col overflow-hidden shrink-0">
      {/* Header */}
      <div className="h-8 border-b border-bd flex items-center px-3 shrink-0">
        <span className="text-[11px] font-mono text-tM uppercase tracking-wider">{t('articleSidebarHeader')}</span>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {articleItems.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-xs text-tM">{t('articleNoItems')}</p>
            <p className="text-[11px] text-tM/60 mt-1">{t('articleNoItemsHint')}</p>
          </div>
        ) : (
          <>
            {topLevels.map((tl) => {
              const tlItems = articleItems.filter(i => i.tl.id === tl.id);
              if (tlItems.length === 0) return null;
              return (
                <div key={tl.id}>
                  <div className="px-3 py-1.5 flex items-center gap-1 group/tl">
                    <span className="text-[10px] font-semibold text-aO uppercase tracking-wider flex-1">{tl.name}</span>
                    <button
                      onClick={() => setWpConfigTopic({ id: tl.id, name: tl.name })}
                      className="hidden group-hover/tl:flex w-4 h-4 items-center justify-center rounded text-tM hover:text-aB transition-colors"
                      title={t('treeWpConfig')}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><circle cx="12" cy="12" r="10" /><path d="M3.5 12l3.2 8.5L9 13l4-1-4-1L6.7 3.5 3.5 12z" /></svg>
                    </button>
                    <button
                      onClick={() => setShopifyConfigTopic({ id: tl.id, name: tl.name })}
                      className="hidden group-hover/tl:flex w-4 h-4 items-center justify-center rounded text-tM hover:text-aG transition-colors"
                      title={t('treeShopifyConfig')}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><path d="M15.5 2.5L14 4l1 2-1 1 3 3 1-1 2 1 1.5-1.5-5-5z" /><path d="M14 4l-9.5 9.5a2 2 0 0 0 0 2.83l2.17 2.17a2 2 0 0 0 2.83 0L19 9" /></svg>
                    </button>
                  </div>
                  {tl.keywords.map((kw) => {
                    const kwItems = tlItems.filter(i => i.kw.id === kw.id);
                    if (kwItems.length === 0) return null;
                    return (
                      <div key={kw.id}>
                        <div className="px-4 py-1 text-[11px] text-t2 font-mono truncate">
                          {kw.keyword}
                        </div>
                        {kwItems.map(({ result }) => {
                          const articleStatus = result.article?.status ?? 'READY';
                          const color = ARTICLE_STATUS_COLOR[articleStatus] ?? '#8b949e';
                          const label = ARTICLE_STATUS_LABEL[articleStatus] ?? articleStatus;
                          const isSelected = result.id === selectedResultId;

                          return (
                            <div
                              key={result.id}
                              onClick={() => onSelect(result)}
                              className={`mx-2 mb-1 rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                                isSelected ? 'bg-aB/15 border border-aB/40' : 'bg-bg0 border border-bd hover:border-aB/30 hover:bg-bg2'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <span className="w-2 h-2 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: color }} />
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-t1 leading-snug line-clamp-2 mb-1">
                                    {result.title}
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span
                                      className="text-[10px] px-1.5 py-0.5 rounded-full"
                                      style={{ background: `${color}22`, color }}
                                    >
                                      {label}
                                    </span>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); onOpenRef(result); }}
                                      className="text-[10px] text-tM hover:text-t2 transition-colors"
                                      title="ペルソナ・構成を参照"
                                    >
                                      ℹ
                                    </button>
                                  </div>
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
            })}
          </>
        )}
      </div>

      {wpConfigTopic && (
        <WpConfigModal topLevelId={wpConfigTopic.id} topicName={wpConfigTopic.name} onClose={() => setWpConfigTopic(null)} />
      )}
      {shopifyConfigTopic && (
        <ShopifyConfigModal topLevelId={shopifyConfigTopic.id} topicName={shopifyConfigTopic.name} onClose={() => setShopifyConfigTopic(null)} />
      )}
    </div>
  );
}
