import { useState } from 'react';
import type { GeneratedResult, ResultStatus } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

type FilterStep = '01' | '02' | '03' | 'all';

interface Props {
  results: GeneratedResult[];
  isGenerating?: boolean;
  filterStep: FilterStep;
  onUpdateResult: (id: string, data: Record<string, unknown>) => void;
  onDeleteResult: (id: string) => void;
  onSkip: (id: string) => void;
  onRestore: (id: string) => void;
  onGoStep2: (id: string) => void;
  onGoStep3: (id: string) => void;
  onRowClick: (result: GeneratedResult) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: (checked: boolean, visibleIds: string[]) => void;
}

const STEP01_STATUSES: ResultStatus[] = ['DRAFT', 'READY', 'KW_DONE'];
const STEP02_STATUSES: ResultStatus[] = ['PERSONA_WIP', 'PERSONA_DONE'];
const STEP03_STATUSES: ResultStatus[] = ['STRUCT_WIP', 'STRUCT_DONE'];

const STATUS_STYLE: Record<ResultStatus, { bg: string; text: string; label?: string }> = {
  DRAFT:        { bg: 'rgba(139,148,158,.15)', text: '#8b949e' },
  READY:        { bg: 'rgba(88,166,255,.15)',  text: '#58a6ff' },
  KW_DONE:      { bg: 'rgba(63,185,80,.15)',   text: '#3fb950' },
  PERSONA_WIP:  { bg: 'rgba(210,153,34,.15)',  text: '#d29922' },
  PERSONA_DONE: { bg: 'rgba(57,210,192,.15)',  text: '#39d2c0' },
  STRUCT_WIP:   { bg: 'rgba(188,140,255,.15)', text: '#bc8cff' },
  STRUCT_DONE:  { bg: 'rgba(248,122,186,.15)', text: '#f778ba' },
  PUBLISHED:    { bg: 'rgba(248,81,73,.12)',   text: '#f85149' },
  SKIPPED:      { bg: 'rgba(139,148,158,.10)', text: '#484f58' },
};

function TruncCell({ value }: { value: string | undefined | null }) {
  if (!value) return <span className="text-tM text-xs">—</span>;
  return (
    <div className="text-xs text-t2 max-w-[120px] truncate" title={value}>{value}</div>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-t border-bd/50">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-3 py-2.5">
          <div className="h-3 rounded bg-gradient-to-r from-bg2 via-bg1 to-bg2 bg-[length:200%_100%] animate-shimmer" style={{ width: i === 2 ? 200 : 80 }} />
        </td>
      ))}
    </tr>
  );
}

export default function ResultsTable({
  results,
  isGenerating,
  filterStep,
  onUpdateResult,
  onDeleteResult,
  onSkip,
  onRestore,
  onGoStep2,
  onGoStep3,
  onRowClick,
  selectedIds,
  onToggleSelect,
  onToggleAll,
}: Props) {
  const { t } = useLanguage();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [search, setSearch] = useState('');

  function startEditTitle(result: GeneratedResult, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingId(result.id);
    setEditDraft(result.title);
  }

  function commitTitle(id: string) {
    if (editDraft.trim()) onUpdateResult(id, { title: editDraft.trim() });
    setEditingId(null);
  }

  // Filter by step
  const stepFiltered = results.filter((r) => {
    if (filterStep === 'all') return true;
    if (filterStep === '01') return STEP01_STATUSES.includes(r.status);
    if (filterStep === '02') return STEP02_STATUSES.includes(r.status);
    if (filterStep === '03') return STEP03_STATUSES.includes(r.status) || r.status === 'PUBLISHED';
    return true;
  });

  const filtered = stepFiltered.filter((r) => {
    if (!search) return true;
    return r.keywordText.toLowerCase().includes(search.toLowerCase()) ||
      r.title.toLowerCase().includes(search.toLowerCase());
  });

  function renderGateButton(result: GeneratedResult) {
    const s = result.status;
    if (s === 'SKIPPED') {
      return (
        <button
          onClick={(e) => { e.stopPropagation(); onRestore(result.id); }}
          className="text-xs px-2 py-0.5 rounded border border-t2 text-t2 hover:border-t1 hover:text-t1 transition-colors whitespace-nowrap"
        >
          {t('gateRestore')}
        </button>
      );
    }
    if (s === 'DRAFT' || s === 'READY' || s === 'KW_DONE') {
      return (
        <div className="flex flex-col gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onGoStep2(result.id); }}
            className="text-xs px-2 py-0.5 rounded bg-aB/20 text-aB hover:bg-aB/30 transition-colors whitespace-nowrap"
          >
            {t('gateNextStep')}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onSkip(result.id); }}
            className="text-xs px-2 py-0.5 rounded border border-aR/40 text-aR hover:border-aR transition-colors whitespace-nowrap"
          >
            {t('gateSkipTitle')}
          </button>
        </div>
      );
    }
    if (s === 'PERSONA_WIP') {
      return <span className="text-xs text-aO">{t('gateGenerating')}</span>;
    }
    if (s === 'PERSONA_DONE') {
      return (
        <div className="flex flex-col gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onGoStep3(result.id); }}
            className="text-xs px-2 py-0.5 rounded bg-aG/20 text-aG hover:bg-aG/30 transition-colors whitespace-nowrap"
          >
            {t('gateFactCheck')}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onSkip(result.id); }}
            className="text-xs px-2 py-0.5 rounded border border-t2/30 text-t2 hover:border-t1 transition-colors whitespace-nowrap"
          >
            {t('gateSkipDemoSize')}
          </button>
        </div>
      );
    }
    if (s === 'STRUCT_WIP') {
      return <span className="text-xs text-aP">{t('gateRunningFC')}</span>;
    }
    if (s === 'STRUCT_DONE') {
      return <span className="text-xs text-aG">{t('gateDone')}</span>;
    }
    if (s === 'PUBLISHED') {
      return <span className="text-xs text-aR">{t('gatePublished')}</span>;
    }
    return null;
  }

  if (results.length === 0 && isGenerating) {
    return (
      <div className="bg-bg1 border border-bd rounded-lg overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-bd">
          <svg className="w-4 h-4 text-aP animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="60" strokeDashoffset="20" strokeLinecap="round" />
          </svg>
          <span className="text-t2 text-xs font-mono">Generating keyword + title pairs…</span>
        </div>
        <table className="w-full border-collapse">
          <tbody>{Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}</tbody>
        </table>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12 text-tM text-sm">
        <p>{t('resultsEmpty')}</p>
        <p className="text-xs mt-1 opacity-60">{t('resultsEmptyHint')}</p>
      </div>
    );
  }

  const allVisibleIds = filtered.map(r => r.id);
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedIds.has(id));

  const FC_HIGHLIGHT_INDICES = new Set([8, 9, 10, 11, 12]);
  const isFcStep = filterStep === '03';
  const fcCellCls = isFcStep ? 'bg-aP/[0.05]' : '';

  return (
    <div className="bg-bg1 border border-bd rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-bd">
        <div className="flex items-center gap-2 bg-bg0 border border-bd rounded px-2 py-1 flex-1 max-w-xs">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-tM shrink-0">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('resultsSearch')}
            className="bg-transparent border-0 text-t1 text-xs outline-none w-full placeholder-tM"
          />
        </div>
        <span className="text-xs text-tM ml-auto">{filtered.length} / {results.length}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs" style={{ minWidth: 1600 }}>
          <thead>
            <tr className="bg-bg2 sticky top-0 z-10">
              <th className="w-8 px-2 py-2 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => onToggleAll(e.target.checked, allVisibleIds)}
                  className="w-3.5 h-3.5 accent-aB cursor-pointer"
                />
              </th>
              {[
                t('resultsColKeyword'),
                t('resultsColTitle'),
                t('resultsColStatus'),
                t('resultsColAction'),
                t('resultsColDemographic'),
                t('resultsColPersona1'),
                t('resultsColPersona2'),
                t('resultsColPersona3'),
                t('resultsColDemoSize1'),
                t('resultsColDemoSize2'),
                t('resultsColDemoSize3'),
                t('resultsColFactCheck'),
                t('resultsColTargetDecision'),
                t('resultsColStructIntro'),
                t('resultsColStructNayami'),
                t('resultsColStructP1'),
                t('resultsColStructP2'),
                t('resultsColStructP3'),
                t('resultsColStructCommon'),
                t('resultsColStructCta'),
                t('resultsColStructMatome'),
                t('resultsColStructH2'),
                '',
              ].map((col, i) => (
                <th
                  key={i}
                  className={`px-3 py-2 text-left font-mono text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap ${
                    isFcStep && FC_HIGHLIGHT_INDICES.has(i)
                      ? 'bg-aP/20 text-aP border-b-2 border-aP/40'
                      : 'text-tM'
                  }`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((result) => {
              const style = STATUS_STYLE[result.status] ?? { bg: 'rgba(139,148,158,.15)', text: '#8b949e' };
              const isSkipped = result.status === 'SKIPPED';
              return (
                <tr
                  key={result.id}
                  onClick={() => onRowClick(result)}
                  className={`border-t border-bd/50 hover:bg-aB/[0.04] transition-colors cursor-pointer group ${isSkipped ? 'opacity-45' : ''}`}
                >
                  {/* Checkbox */}
                  <td className="px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(result.id)}
                      onChange={() => onToggleSelect(result.id)}
                      className="w-3.5 h-3.5 accent-aB cursor-pointer"
                    />
                  </td>
                  {/* Keyword */}
                  <td className="px-3 py-2 font-mono text-xs text-aC">
                    {result.keywordText}
                  </td>
                  {/* Title */}
                  <td className="px-3 py-2 max-w-[240px]">
                    {editingId === result.id ? (
                      <input
                        autoFocus
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        onBlur={() => commitTitle(result.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitTitle(result.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-bg0 border border-aB rounded px-2 py-1 text-t1 text-xs focus:outline-none"
                      />
                    ) : (
                      <div
                        title={result.title}
                        onDoubleClick={(e) => startEditTitle(result, e)}
                        className={`text-t1 text-xs leading-snug line-clamp-2 ${isSkipped ? 'line-through text-tM' : ''}`}
                      >
                        {result.title}
                      </div>
                    )}
                  </td>
                  {/* Status badge */}
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                      style={{ background: style.bg, color: style.text }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: style.text }} />
                      {result.status.replace(/_/g, ' ').toLowerCase()}
                    </span>
                  </td>
                  {/* Gate action */}
                  <td className="px-3 py-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    {renderGateButton(result)}
                  </td>
                  {/* Persona fields */}
                  <td className="px-3 py-2"><TruncCell value={result.demographic} /></td>
                  <td className="px-3 py-2"><TruncCell value={result.persona1} /></td>
                  <td className="px-3 py-2"><TruncCell value={result.persona2} /></td>
                  <td className="px-3 py-2"><TruncCell value={result.persona3} /></td>
                  <td className={`px-3 py-2 ${fcCellCls}`}><TruncCell value={result.demoSize1} /></td>
                  <td className={`px-3 py-2 ${fcCellCls}`}><TruncCell value={result.demoSize2} /></td>
                  <td className={`px-3 py-2 ${fcCellCls}`}><TruncCell value={result.demoSize3} /></td>
                  {/* Fact check */}
                  <td className={`px-3 py-2 ${fcCellCls}`}>
                    {result.factCheck ? (
                      <div className="flex flex-col gap-0.5">
                        {Object.entries(result.factCheck).slice(0, 2).map(([k, v]) => (
                          <div key={k} className="flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${v.verified ? 'bg-aG' : 'bg-aO'}`} />
                            {v.searchResults?.[0]?.link ? (
                              <a
                                href={v.searchResults[0].link}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-aB text-[10px] hover:underline truncate max-w-[100px]"
                              >
                                {v.searchResults[0].title}
                              </a>
                            ) : (
                              <span className="text-tM text-[10px]">{k}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-tM text-xs">—</span>
                    )}
                  </td>
                  {/* Target decision */}
                  <td className={`px-3 py-2 ${fcCellCls}`}><TruncCell value={result.targetDecision} /></td>
                  {/* Structure fields */}
                  <td className="px-3 py-2"><TruncCell value={result.structIntro} /></td>
                  <td className="px-3 py-2"><TruncCell value={result.structNayami} /></td>
                  <td className="px-3 py-2"><TruncCell value={result.structP1} /></td>
                  <td className="px-3 py-2"><TruncCell value={result.structP2} /></td>
                  <td className="px-3 py-2"><TruncCell value={result.structP3} /></td>
                  <td className="px-3 py-2"><TruncCell value={result.structCommon} /></td>
                  <td className="px-3 py-2"><TruncCell value={result.structCta} /></td>
                  <td className="px-3 py-2"><TruncCell value={result.structMatome} /></td>
                  <td className="px-3 py-2"><TruncCell value={result.structH2} /></td>
                  {/* Edit / Delete */}
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => startEditTitle(result, e)}
                        className="w-6 h-6 flex items-center justify-center rounded text-tM hover:bg-bg2 hover:text-t1 transition-colors"
                        title={t('resultsEdit')}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onDeleteResult(result.id)}
                        className="w-6 h-6 flex items-center justify-center rounded text-tM hover:bg-aR/15 hover:text-aR transition-colors"
                        title={t('resultsDelete')}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                          <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
