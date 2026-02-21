import { useState } from 'react';
import type { GeneratedResult, Status } from '../../types';

interface Props {
  results: GeneratedResult[];
  onUpdateResult: (id: string, data: { title?: string; status?: string }) => void;
  onDeleteResult: (id: string) => void;
}

const STATUS_COLORS: Record<Status, string> = {
  DRAFT: 'bg-tM text-t2',
  READY: 'bg-aB/20 text-aB',
  PROGRESS: 'bg-aO/20 text-aO',
  DONE: 'bg-aG/20 text-aG',
  PUBLISHED: 'bg-aP/20 text-aP',
};

const STATUS_LABELS: Record<Status, string> = {
  DRAFT: 'Draft',
  READY: 'Ready',
  PROGRESS: 'Progress',
  DONE: 'Done',
  PUBLISHED: 'Published',
};

export default function ResultsTable({ results, onUpdateResult, onDeleteResult }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  function startEditTitle(result: GeneratedResult) {
    setEditingId(result.id);
    setEditDraft(result.title);
  }

  function commitTitle(id: string) {
    if (editDraft.trim()) onUpdateResult(id, { title: editDraft.trim() });
    setEditingId(null);
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12 text-tM text-sm">
        No results yet — click <span className="text-aB">✨ Generate</span> to create content ideas
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {results.map((result) => (
        <div
          key={result.id}
          className="bg-bg1 border border-bd rounded-lg px-4 py-3 flex items-start gap-3 group hover:border-t2 transition-colors"
        >
          {/* Status badge */}
          <button
            onClick={() => onUpdateResult(result.id, { status: 'cycle' })}
            className={`shrink-0 mt-0.5 px-2 py-0.5 rounded text-xs font-medium cursor-pointer transition-opacity hover:opacity-80 ${STATUS_COLORS[result.status]}`}
            title="Click to cycle status"
          >
            {STATUS_LABELS[result.status]}
          </button>

          {/* Keyword + title */}
          <div className="flex-1 min-w-0">
            <div className="text-tM text-xs font-mono mb-0.5 truncate">{result.keywordText}</div>
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
                className="text-t1 text-sm cursor-text hover:text-t1"
                title="Double-click to edit"
              >
                {result.title}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => startEditTitle(result)}
              className="text-t2 hover:text-aB text-xs px-1"
              title="Edit title"
            >
              ✎
            </button>
            <button
              onClick={() => onDeleteResult(result.id)}
              className="text-t2 hover:text-aR text-xs px-1"
              title="Delete"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
