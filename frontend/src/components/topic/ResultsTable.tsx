import { useState } from 'react';
import type { GeneratedResult, Status } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface Props {
  results: GeneratedResult[];
  onUpdateResult: (id: string, data: { title?: string; status?: string }) => void;
  onDeleteResult: (id: string) => void;
}

const STATUS_CYCLE: Status[] = ['DRAFT', 'READY', 'PROGRESS', 'DONE', 'PUBLISHED'];

const STATUS_COLORS: Record<Status, string> = {
  DRAFT: 'bg-t2/15 text-t2',
  READY: 'bg-aB/15 text-aB',
  PROGRESS: 'bg-aO/15 text-aO',
  DONE: 'bg-aG/15 text-aG',
  PUBLISHED: 'bg-aP/15 text-aP',
};

const STATUS_DOT: Record<Status, string> = {
  DRAFT: 'bg-t2',
  READY: 'bg-aB',
  PROGRESS: 'bg-aO',
  DONE: 'bg-aG',
  PUBLISHED: 'bg-aP',
};

export default function ResultsTable({ results, onUpdateResult, onDeleteResult }: Props) {
  const { t } = useLanguage();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<Status | 'ALL'>('ALL');

  const statusLabels: Record<Status, string> = {
    DRAFT: t('statusDraft'),
    READY: t('statusReady'),
    PROGRESS: t('statusProgress'),
    DONE: t('statusDone'),
    PUBLISHED: t('statusPublished'),
  };

  function startEditTitle(result: GeneratedResult) {
    setEditingId(result.id);
    setEditDraft(result.title);
  }

  function commitTitle(id: string) {
    if (editDraft.trim()) onUpdateResult(id, { title: editDraft.trim() });
    setEditingId(null);
  }

  function toggleCheck(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.checked) setChecked(new Set(filtered.map((r) => r.id)));
    else setChecked(new Set());
  }

  const filtered = results.filter((r) => {
    const matchSearch = search === '' || r.keywordText.toLowerCase().includes(search.toLowerCase()) || r.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'ALL' || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Stats
  const total = results.length;
  const ready = results.filter((r) => r.status === 'READY').length;
  const progress = results.filter((r) => r.status === 'PROGRESS').length;
  const done = results.filter((r) => r.status === 'DONE' || r.status === 'PUBLISHED').length;

  if (results.length === 0) {
    return (
      <div className="text-center py-12 text-tM text-sm">
        <p>{t('resultsEmpty')}</p>
        <p className="text-xs mt-1 opacity-60">{t('resultsEmptyHint')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Stats row */}
      <div className="flex gap-3">
        {[
          { label: 'total', value: total, color: 'text-aB' },
          { label: 'ready', value: ready, color: 'text-aG' },
          { label: 'progress', value: progress, color: 'text-aO' },
          { label: 'completed', value: done, color: 'text-aP' },
        ].map((s) => (
          <div key={s.label} className="flex-1 bg-bg1 border border-bd rounded-lg px-4 py-3">
            <div className="text-tM text-[10px] font-mono uppercase tracking-wider mb-1">{s.label}</div>
            <div className={`text-[22px] font-bold font-mono ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-bg1 border border-bd rounded-lg overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-bd flex-wrap">
          <div className="flex items-center gap-2 bg-bg0 border border-bd rounded-md px-2.5 py-1.5 flex-1 min-w-[180px] max-w-xs">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-tM shrink-0">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('resultsSearch')}
              className="bg-transparent border-0 text-t1 text-xs outline-none w-full placeholder-tM font-mono"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {(['ALL', ...STATUS_CYCLE] as (Status | 'ALL')[]).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-2.5 py-1 rounded-full text-[11px] border transition-all cursor-pointer ${
                  filterStatus === s
                    ? 'bg-aB/15 border-aB text-aB'
                    : 'border-bd text-t2 hover:border-aB hover:text-aB bg-transparent'
                }`}
              >
                {s === 'ALL' ? t('resultsAll') : statusLabels[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-bg2">
                <th className="w-9 px-3 py-2 text-left">
                  <input
                    type="checkbox"
                    onChange={toggleAll}
                    checked={filtered.length > 0 && filtered.every((r) => checked.has(r.id))}
                    className="w-[15px] h-[15px] accent-aB cursor-pointer"
                  />
                </th>
                <th className="px-3 py-2 text-left font-mono text-[11px] font-semibold uppercase tracking-wider text-tM">{t('resultsColKeyword')}</th>
                <th className="px-3 py-2 text-left font-mono text-[11px] font-semibold uppercase tracking-wider text-tM">{t('resultsColTitle')}</th>
                <th className="px-3 py-2 text-left font-mono text-[11px] font-semibold uppercase tracking-wider text-tM">{t('resultsColStatus')}</th>
                <th className="w-[70px] px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((result) => (
                <tr
                  key={result.id}
                  className="border-t border-bd/50 hover:bg-aB/[0.04] transition-colors group"
                >
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={checked.has(result.id)}
                      onChange={() => toggleCheck(result.id)}
                      className="w-[15px] h-[15px] accent-aB cursor-pointer"
                    />
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-aC">{result.keywordText}</td>
                  <td className="px-3 py-2 max-w-sm">
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
                        className="w-full bg-bg0 border border-aB rounded px-2 py-1 text-t1 text-sm focus:outline-none"
                      />
                    ) : (
                      <div
                        onDoubleClick={() => startEditTitle(result)}
                        className="text-t1 text-sm cursor-text px-1.5 py-1 rounded hover:bg-bg2 transition-colors leading-snug"
                      >
                        {result.title}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => onUpdateResult(result.id, { status: 'cycle' })}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer transition-opacity hover:opacity-80 ${STATUS_COLORS[result.status]}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[result.status]}`} />
                      {statusLabels[result.status]}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEditTitle(result)}
                        className="w-[26px] h-[26px] flex items-center justify-center rounded-md text-tM hover:bg-bg2 hover:text-t1 transition-colors"
                        title={t('resultsEdit')}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[15px] h-[15px]">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onDeleteResult(result.id)}
                        className="w-[26px] h-[26px] flex items-center justify-center rounded-md text-tM hover:bg-aR/15 hover:text-aR transition-colors"
                        title={t('resultsDelete')}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[15px] h-[15px]">
                          <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
