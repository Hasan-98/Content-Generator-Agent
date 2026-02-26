import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import type { GeneratedResult } from '../../types';

interface Props {
  result: GeneratedResult;
  onClose: () => void;
}

type Tab = 'persona' | 'structure' | 'demographics';

function RefField({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="mb-3">
      <div className="text-[11px] text-t2 font-medium mb-1">{label}</div>
      <div className="text-xs text-t1 bg-bg0 rounded p-2 border border-bd whitespace-pre-wrap leading-relaxed">
        {value}
      </div>
    </div>
  );
}

export default function ReferenceModal({ result, onClose }: Props) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>('persona');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backdropFilter: 'blur(4px)', background: 'rgba(13,17,23,0.7)' }}
      onClick={onClose}
    >
      <div
        className="bg-bg1 border border-bd rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: 720, maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-bd shrink-0">
          <div>
            <div className="text-[11px] text-t2 mb-0.5">{result.keywordText}</div>
            <div className="text-sm text-t1 font-semibold">{result.title}</div>
          </div>
          <button onClick={onClose} className="text-t2 hover:text-t1 text-lg ml-4 transition-colors">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-bd shrink-0 px-2">
          {(['persona', 'structure', 'demographics'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-xs font-medium transition-colors ${
                activeTab === tab
                  ? 'text-aB border-b-2 border-aB -mb-px'
                  : 'text-t2 hover:text-t1'
              }`}
            >
              {tab === 'persona' ? t('refTabPersona')
                : tab === 'structure' ? t('refTabStructure')
                : t('refTabDemographics')}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'persona' && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'ペルソナ1', value: result.persona1 },
                { label: 'ペルソナ2', value: result.persona2 },
                { label: 'ペルソナ3', value: result.persona3 },
              ].map((p) => (
                <div key={p.label} className="bg-bg0 rounded-lg p-3 border border-bd">
                  <div className="text-xs font-semibold text-aP mb-2">{p.label}</div>
                  <div className="text-xs text-t1 leading-relaxed whitespace-pre-wrap">
                    {p.value || <span className="text-tM italic">—</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'structure' && (
            <div className="space-y-0">
              <RefField label="イントロ" value={result.structIntro} />
              <RefField label="悩み" value={result.structNayami} />
              <RefField label="ポイント1" value={result.structP1} />
              <RefField label="ポイント2" value={result.structP2} />
              <RefField label="ポイント3" value={result.structP3} />
              <RefField label="よくある誤解" value={result.structCommon} />
              <RefField label="CTA" value={result.structCta} />
              <RefField label="まとめ" value={result.structMatome} />
              <RefField label="H2キーワード" value={result.structH2} />
            </div>
          )}

          {activeTab === 'demographics' && (
            <div>
              <RefField label="デモグラフィック" value={result.demographic} />
              <div className="grid grid-cols-3 gap-3 mt-2">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="bg-bg0 rounded-lg p-3 border border-bd">
                    <div className="text-xs font-semibold text-aO mb-1">デモサイズ{n}</div>
                    <div className="text-xs text-t1">
                      {(result as Record<string, unknown>)[`demoSize${n}`] as string || <span className="text-tM italic">—</span>}
                    </div>
                  </div>
                ))}
              </div>
              {result.factCheck && (
                <div className="mt-4">
                  <div className="text-xs font-semibold text-aG mb-2 uppercase tracking-wider">ファクトチェック</div>
                  {Object.entries(result.factCheck).map(([key, val]) => (
                    <div key={key} className="mb-3 p-3 rounded border border-bd bg-bg0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-t2 font-medium capitalize">{key}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${val.verified ? 'bg-aG/20 text-aG' : 'bg-aO/20 text-aO'}`}>
                          {val.verified ? '✓ 確認済' : '? 要確認'}
                        </span>
                      </div>
                      {val.searchResults?.slice(0, 3).map((sr, i) => (
                        <a
                          key={i}
                          href={sr.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs text-aB hover:underline truncate mb-0.5"
                        >
                          {sr.title}
                        </a>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              {result.targetDecision && (
                <div className="mt-3 p-3 rounded-lg border border-aG bg-aG/10">
                  <div className="text-xs font-semibold text-aG mb-1">ターゲット判定</div>
                  <div className="text-xs text-t1">{result.targetDecision}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-5 py-3 border-t border-bd shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-bd text-t2 text-xs hover:text-t1 hover:border-t1 transition-colors"
          >
            {t('refClose')}
          </button>
        </div>
      </div>
    </div>
  );
}
