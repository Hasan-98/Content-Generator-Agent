import { useState, KeyboardEvent } from 'react';
import { TopLevel, Keyword } from '../../types';

interface Props {
  topLevels: TopLevel[];
  selectedTopLevelId: string | null;
  selectedKeywordId: string | null;
  onSelectTopLevel: (id: string) => void;
  onSelectKeyword: (topLevelId: string, keywordId: string) => void;
  onRenameTopLevel: (id: string, name: string) => void;
  onDeleteTopLevel: (id: string) => void;
  onAddTopLevel: (name: string) => void;
  onAddKeyword: (topLevelId: string) => void;
  onDeleteKeyword: (id: string) => void;
}

export default function TopicTree({
  topLevels,
  selectedTopLevelId,
  selectedKeywordId,
  onSelectTopLevel,
  onSelectKeyword,
  onRenameTopLevel,
  onDeleteTopLevel,
  onAddTopLevel,
  onAddKeyword,
  onDeleteKeyword,
}: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [editingTL, setEditingTL] = useState<string | null>(null);
  const [editTLName, setEditTLName] = useState('');
  const [addingTL, setAddingTL] = useState(false);
  const [newTLName, setNewTLName] = useState('');

  function toggleCollapse(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function startEditTL(tl: TopLevel) {
    setEditingTL(tl.id);
    setEditTLName(tl.name);
  }

  function commitEditTL(id: string) {
    if (editTLName.trim()) onRenameTopLevel(id, editTLName.trim());
    setEditingTL(null);
  }

  function handleEditKeyDown(e: KeyboardEvent, id: string) {
    if (e.key === 'Enter') commitEditTL(id);
    if (e.key === 'Escape') setEditingTL(null);
  }

  function handleNewTLKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && newTLName.trim()) {
      onAddTopLevel(newTLName.trim());
      setNewTLName('');
      setAddingTL(false);
    }
    if (e.key === 'Escape') {
      setAddingTL(false);
      setNewTLName('');
    }
  }

  return (
    <div className="w-80 bg-bg1 border-r border-bd flex flex-col shrink-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-bd">
        <span className="text-t2 text-xs uppercase tracking-wider font-medium">Topics</span>
        <button
          onClick={() => setAddingTL(true)}
          className="text-t2 hover:text-t1 text-lg leading-none transition-colors"
          title="New topic"
        >
          +
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {topLevels.map((tl) => (
          <div key={tl.id}>
            {/* TopLevel row */}
            <div
              className={`flex items-center gap-1 px-2 py-1 group cursor-pointer hover:bg-bg2 ${
                selectedTopLevelId === tl.id && !selectedKeywordId ? 'bg-bg2' : ''
              }`}
              onClick={() => {
                onSelectTopLevel(tl.id);
                toggleCollapse(tl.id);
              }}
            >
              <span className="text-tM text-xs w-4 text-center">
                {collapsed.has(tl.id) ? '▶' : '▼'}
              </span>

              {editingTL === tl.id ? (
                <input
                  autoFocus
                  value={editTLName}
                  onChange={(e) => setEditTLName(e.target.value)}
                  onBlur={() => commitEditTL(tl.id)}
                  onKeyDown={(e) => handleEditKeyDown(e, tl.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 bg-bg0 border border-aB rounded px-1 text-t1 text-xs focus:outline-none"
                />
              ) : (
                <span
                  className="flex-1 text-t1 text-xs truncate"
                  onDoubleClick={(e) => { e.stopPropagation(); startEditTL(tl); }}
                >
                  {tl.name}
                </span>
              )}

              <div className="hidden group-hover:flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); onAddKeyword(tl.id); }}
                  className="text-t2 hover:text-aG text-xs px-1"
                  title="Add keyword"
                >
                  +
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); startEditTL(tl); }}
                  className="text-t2 hover:text-aB text-xs px-1"
                  title="Rename"
                >
                  ✎
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteTopLevel(tl.id); }}
                  className="text-t2 hover:text-aR text-xs px-1"
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Keywords */}
            {!collapsed.has(tl.id) &&
              tl.keywords.map((kw) => (
                <KeywordRow
                  key={kw.id}
                  keyword={kw}
                  isSelected={selectedKeywordId === kw.id}
                  onSelect={() => onSelectKeyword(tl.id, kw.id)}
                  onDelete={() => onDeleteKeyword(kw.id)}
                />
              ))}
          </div>
        ))}

        {/* Add new top-level input */}
        {addingTL && (
          <div className="px-2 py-1">
            <input
              autoFocus
              value={newTLName}
              onChange={(e) => setNewTLName(e.target.value)}
              onBlur={() => {
                if (newTLName.trim()) onAddTopLevel(newTLName.trim());
                setAddingTL(false);
                setNewTLName('');
              }}
              onKeyDown={handleNewTLKeyDown}
              placeholder="Topic name…"
              className="w-full bg-bg0 border border-aB rounded px-2 py-1 text-t1 text-xs focus:outline-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function KeywordRow({
  keyword,
  isSelected,
  onSelect,
  onDelete,
}: {
  keyword: Keyword;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-1 pl-8 pr-2 py-1 group cursor-pointer hover:bg-bg2 ${
        isSelected ? 'bg-bg2' : ''
      }`}
    >
      <span className="text-tM text-xs">⌗</span>
      <span className="flex-1 text-t2 text-xs truncate">{keyword.keyword}</span>
      <span className="text-tM text-xs hidden group-hover:inline">
        {keyword.results.length}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="hidden group-hover:inline text-t2 hover:text-aR text-xs px-0.5"
        title="Delete keyword"
      >
        ✕
      </button>
    </div>
  );
}
