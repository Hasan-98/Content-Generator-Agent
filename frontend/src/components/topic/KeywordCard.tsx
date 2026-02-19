import { useState } from 'react';
import { Keyword } from '../../types';

interface Props {
  keyword: Keyword;
  onUpdate: (id: string, data: { keyword?: string; goal?: string; audience?: string }) => void;
  onGenerate: (keywordId: string) => void;
  generating: boolean;
}

export default function KeywordCard({ keyword, onUpdate, onGenerate, generating }: Props) {
  const [editing, setEditing] = useState<'keyword' | 'goal' | 'audience' | null>(null);
  const [draft, setDraft] = useState('');

  function startEdit(field: 'keyword' | 'goal' | 'audience') {
    setEditing(field);
    setDraft(keyword[field]);
  }

  function commit(field: 'keyword' | 'goal' | 'audience') {
    if (draft.trim() !== keyword[field]) {
      onUpdate(keyword.id, { [field]: draft.trim() });
    }
    setEditing(null);
  }

  function renderField(label: string, field: 'keyword' | 'goal' | 'audience', placeholder: string) {
    return (
      <div>
        <div className="text-tM text-xs mb-1">{label}</div>
        {editing === field ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => commit(field)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit(field);
              if (e.key === 'Escape') setEditing(null);
            }}
            className="w-full bg-bg0 border border-aB rounded px-2 py-1 text-t1 text-xs focus:outline-none"
          />
        ) : (
          <div
            onDoubleClick={() => startEdit(field)}
            className={`text-xs px-2 py-1.5 rounded bg-bg0 border border-transparent hover:border-bd cursor-text ${
              keyword[field] ? 'text-t1' : 'text-tM italic'
            }`}
          >
            {keyword[field] || placeholder}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-bg1 border border-bd rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-t2 text-xs uppercase tracking-wider">Keyword Settings</span>
        <button
          onClick={() => onGenerate(keyword.id)}
          disabled={generating}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-aB hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-bg0 text-xs font-medium rounded transition-colors"
        >
          {generating ? (
            <>
              <span className="animate-spin">⟳</span>
              Generating…
            </>
          ) : (
            <>✨ Generate</>
          )}
        </button>
      </div>

      {renderField('Keyword', 'keyword', 'Enter keyword…')}
      {renderField('Content Goal', 'goal', 'What is the content goal?')}
      {renderField('Target Audience', 'audience', 'Who is the target audience?')}

      <div className="text-tM text-xs pt-1 border-t border-bd">
        Double-click a field to edit · {keyword.results.length} result{keyword.results.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
