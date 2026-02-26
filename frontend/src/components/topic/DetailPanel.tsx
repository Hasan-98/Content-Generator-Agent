import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import type { GeneratedResult } from '../../types';
import toast from 'react-hot-toast';
import { regenerateField } from '../../api/generate';
import { generatePersona } from '../../api/generate';

interface Props {
  result: GeneratedResult | null;
  onClose: () => void;
  onUpdate: (updated: GeneratedResult) => void;
}

type Tab = 'all' | 'persona' | 'structure' | 'comment';

const PERSONA_FIELDS = [
  { key: 'demographic', label: 'デモグラフィック' },
  { key: 'persona1', label: 'ペルソナ1' },
  { key: 'persona2', label: 'ペルソナ2' },
  { key: 'persona3', label: 'ペルソナ3' },
  { key: 'demoSize1', label: 'デモサイズ1' },
  { key: 'demoSize2', label: 'デモサイズ2' },
  { key: 'demoSize3', label: 'デモサイズ3' },
];

const STRUCT_FIELDS = [
  { key: 'structIntro', label: 'イントロ' },
  { key: 'structNayami', label: '悩み' },
  { key: 'structP1', label: 'ポイント1' },
  { key: 'structP2', label: 'ポイント2' },
  { key: 'structP3', label: 'ポイント3' },
  { key: 'structCommon', label: 'よくある誤解' },
  { key: 'structCta', label: 'CTA' },
  { key: 'structMatome', label: 'まとめ' },
  { key: 'structH2', label: 'H2キーワード' },
];

function FieldRow({
  label,
  fieldKey,
  value,
  result,
  onUpdate,
}: {
  label: string;
  fieldKey: string;
  value: string | undefined;
  result: GeneratedResult;
  onUpdate: (updated: GeneratedResult) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleRegen() {
    setLoading(true);
    try {
      const updated = await regenerateField(result.id, fieldKey);
      onUpdate(updated);
      toast.success('再生成しました');
    } catch {
      toast.error('再生成に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-3">
      <div className="flex items-center gap-1 mb-1">
        <span className="text-xs text-t2 font-medium">{label}</span>
        <button
          onClick={handleRegen}
          disabled={loading}
          className="text-xs text-aP hover:text-t1 disabled:opacity-40 ml-1 transition-colors"
          title="再生成"
        >
          {loading ? '…' : '🔄'}
        </button>
      </div>
      <div className="text-xs text-t1 bg-bg0 rounded p-2 border border-bd min-h-6 whitespace-pre-wrap">
        {value || <span className="text-tM italic">—</span>}
      </div>
    </div>
  );
}

export default function DetailPanel({ result, onClose, onUpdate }: Props) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [comment, setComment] = useState('');
  const [targetField, setTargetField] = useState('');
  const [regenLoading, setRegenLoading] = useState(false);
  const [genLoading, setGenLoading] = useState(false);

  if (!result) return null;

  const hasPersona = !!(result.persona1 || result.persona2 || result.persona3);

  async function handleGeneratePersona() {
    if (!result) return;
    setGenLoading(true);
    try {
      const updated = await generatePersona(result.id);
      onUpdate(updated);
      toast.success(t('toastPersonaDone'));
    } catch {
      toast.error(t('toastPersonaFailed'));
    } finally {
      setGenLoading(false);
    }
  }

  async function handleRegenWithComment() {
    if (!result || !targetField) return;
    setRegenLoading(true);
    try {
      const updated = await regenerateField(result.id, targetField, comment || undefined);
      onUpdate(updated);
      toast.success(t('toastFieldRegenDone'));
      setComment('');
    } catch {
      toast.error(t('toastFieldRegenFailed'));
    } finally {
      setRegenLoading(false);
    }
  }

  const allFields = [...PERSONA_FIELDS, ...STRUCT_FIELDS];

  return (
    <div className="fixed inset-0 z-40 flex" onClick={onClose}>
      <div className="flex-1" />
      <div
        className="w-96 bg-bg1 border-l border-bd flex flex-col h-full overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-bd shrink-0">
          <div>
            <div className="text-xs text-t2 mb-0.5">{result.keywordText}</div>
            <div className="text-sm text-t1 font-medium line-clamp-1">{result.title}</div>
          </div>
          <button onClick={onClose} className="text-t2 hover:text-t1 text-lg ml-2">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-bd shrink-0">
          {(['all', 'persona', 'structure', 'comment'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 text-xs py-2 transition-colors ${
                activeTab === tab
                  ? 'text-aB border-b-2 border-aB -mb-px'
                  : 'text-t2 hover:text-t1'
              }`}
            >
              {tab === 'all' ? t('detailPanelAll')
                : tab === 'persona' ? t('detailPanelPersona')
                : tab === 'structure' ? t('detailPanelStructure')
                : t('detailPanelComment')}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Generate persona banner */}
          {!hasPersona && activeTab !== 'comment' && (
            <div className="rounded-lg border border-aP p-3 mb-4" style={{ background: 'rgba(188,140,255,0.07)' }}>
              <p className="text-xs text-t2 mb-2">{t('detailGeneratePersonaHint')}</p>
              <button
                onClick={handleGeneratePersona}
                disabled={genLoading}
                className="w-full text-sm py-2 rounded bg-aP text-bg0 font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {genLoading ? '生成中…' : t('detailGeneratePersonaBtn')}
              </button>
            </div>
          )}

          {/* Persona fields */}
          {(activeTab === 'all' || activeTab === 'persona') && (
            <div>
              <div className="text-xs font-semibold text-aP uppercase tracking-wider mb-3">
                {t('detailPersonaSection')}
              </div>
              {PERSONA_FIELDS.map((f) => (
                <FieldRow
                  key={f.key}
                  label={f.label}
                  fieldKey={f.key}
                  value={(result as unknown as Record<string, unknown>)[f.key] as string | undefined}
                  result={result}
                  onUpdate={onUpdate}
                />
              ))}
            </div>
          )}

          {/* Fact check */}
          {(activeTab === 'all' || activeTab === 'persona') && result.factCheck && (
            <div className="mt-4">
              <div className="text-xs font-semibold text-aG uppercase tracking-wider mb-3">
                {t('detailFactCheckSection')}
              </div>
              {Object.entries(result.factCheck).map(([key, val]) => (
                <div key={key} className="mb-3 p-2 rounded border border-bd bg-bg0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-t2 font-medium capitalize">{key}</span>
                    <span className={`text-xs px-1 rounded ${val.verified ? 'text-aG bg-bg2' : 'text-aO bg-bg2'}`}>
                      {val.verified ? '✓ Verified' : '? Unverified'}
                    </span>
                  </div>
                  {val.searchResults?.slice(0, 2).map((sr, i) => (
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
              {result.targetDecision && (
                <div className="text-xs text-t1 bg-bg0 rounded p-2 border border-bd mt-2">
                  {result.targetDecision}
                </div>
              )}
            </div>
          )}

          {/* Structure fields */}
          {(activeTab === 'all' || activeTab === 'structure') && (
            <div className={activeTab === 'all' ? 'mt-4' : ''}>
              <div className="text-xs font-semibold text-aB uppercase tracking-wider mb-3">
                {t('detailStructSection')}
              </div>
              {STRUCT_FIELDS.map((f) => (
                <FieldRow
                  key={f.key}
                  label={f.label}
                  fieldKey={f.key}
                  value={(result as unknown as Record<string, unknown>)[f.key] as string | undefined}
                  result={result}
                  onUpdate={onUpdate}
                />
              ))}
            </div>
          )}

          {/* Comment / Regen tab */}
          {activeTab === 'comment' && (
            <div>
              <div className="text-xs font-semibold text-aO uppercase tracking-wider mb-3">
                {t('detailRegenWithComment')}
              </div>
              <div className="mb-3">
                <label className="text-xs text-t2 mb-1 block">{t('detailTargetField')}</label>
                <select
                  value={targetField}
                  onChange={(e) => setTargetField(e.target.value)}
                  className="w-full text-xs bg-bg0 border border-bd rounded px-2 py-1.5 text-t1"
                >
                  <option value="">-- フィールドを選択 --</option>
                  {allFields.map((f) => (
                    <option key={f.key} value={f.key}>{f.label}</option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="text-xs text-t2 mb-1 block">{t('detailPanelComment')}</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t('detailCommentPlaceholder')}
                  rows={4}
                  className="w-full text-xs bg-bg0 border border-bd rounded px-2 py-1.5 text-t1 resize-none"
                />
              </div>
              <button
                onClick={handleRegenWithComment}
                disabled={regenLoading || !targetField}
                className="w-full text-sm py-2 rounded bg-aO text-bg0 font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {regenLoading ? '再生成中…' : t('detailRegenWithComment')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
