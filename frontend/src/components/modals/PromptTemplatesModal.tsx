import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext';
import {
  listPromptTemplates,
  createPromptTemplate,
  updatePromptTemplate,
  deletePromptTemplate,
  getBasePrompt,
} from '../../api/promptTemplates';
import type { PromptTemplate } from '../../api/promptTemplates';
import { IMEInput, IMETextarea } from '../common/IMEInput';

interface Props {
  onClose: () => void;
  onChanged?: (templates: PromptTemplate[]) => void;
  initialMode?: 'list' | 'create' | { editId: string };
}

export default function PromptTemplatesModal({ onClose, onChanged, initialMode = 'list' }: Props) {
  const { t } = useLanguage();
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [basePrompt, setBasePrompt] = useState('');
  const [showBase, setShowBase] = useState(true);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PromptTemplate | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [draftDefault, setDraftDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listPromptTemplates()
      .then((tpls) => {
        setTemplates(tpls);
        if (initialMode === 'create') {
          setEditing({ id: '', userId: '', name: '', content: '', isDefault: false, createdAt: '', updatedAt: '' });
          setDraftName('');
          setDraftContent('');
          setDraftDefault(false);
        } else if (typeof initialMode === 'object' && initialMode.editId) {
          const tpl = tpls.find(p => p.id === initialMode.editId);
          if (tpl) {
            setEditing(tpl);
            setDraftName(tpl.name);
            setDraftContent(tpl.content);
            setDraftDefault(tpl.isDefault);
          }
        }
      })
      .catch(() => toast.error(t('promptTplLoadFailed')))
      .finally(() => setLoading(false));
    getBasePrompt().then(({ content }) => setBasePrompt(content)).catch(() => { /* silent */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function notifyChange(next: PromptTemplate[]) {
    setTemplates(next);
    onChanged?.(next);
  }

  function startNew() {
    setEditing({ id: '', userId: '', name: '', content: '', isDefault: false, createdAt: '', updatedAt: '' });
    setDraftName('');
    setDraftContent('');
    setDraftDefault(false);
  }

  function startEdit(tpl: PromptTemplate) {
    setEditing(tpl);
    setDraftName(tpl.name);
    setDraftContent(tpl.content);
    setDraftDefault(tpl.isDefault);
  }

  async function handleSave() {
    if (!draftName.trim() || !draftContent.trim()) {
      toast.error(t('promptTplValidationFailed'));
      return;
    }
    setSaving(true);
    try {
      if (editing && editing.id) {
        const updated = await updatePromptTemplate(editing.id, {
          name: draftName,
          content: draftContent,
          isDefault: draftDefault,
        });
        notifyChange(templates.map(p => (p.id === updated.id ? updated : p)).map(p => (
          draftDefault && p.id !== updated.id ? { ...p, isDefault: false } : p
        )));
        toast.success(t('promptTplSaved'));
      } else {
        const created = await createPromptTemplate({
          name: draftName,
          content: draftContent,
          isDefault: draftDefault,
        });
        notifyChange([
          created,
          ...templates.map(p => draftDefault ? { ...p, isDefault: false } : p),
        ]);
        toast.success(t('promptTplCreated'));
      }
      setEditing(null);
    } catch {
      toast.error(t('promptTplSaveFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(tpl: PromptTemplate) {
    if (!confirm(t('promptTplDeleteConfirm'))) return;
    try {
      await deletePromptTemplate(tpl.id);
      notifyChange(templates.filter(p => p.id !== tpl.id));
      if (editing?.id === tpl.id) setEditing(null);
      toast.success(t('promptTplDeleted'));
    } catch {
      toast.error(t('promptTplDeleteFailed'));
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-bg1 border border-bd rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-bd shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-t1">{t('promptTplTitle')}</h2>
            <p className="text-[11px] text-tM mt-0.5">{t('promptTplSubtitle')}</p>
          </div>
          <button onClick={onClose} className="text-tM hover:text-t1 transition-colors text-xl leading-none">×</button>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* List */}
          <div className="w-64 border-r border-bd overflow-y-auto shrink-0">
            <button
              onClick={startNew}
              className="w-full px-3 py-2 text-left text-xs text-aB hover:bg-bg2 border-b border-bd transition-colors flex items-center gap-2"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M12 5v14M5 12h14" />
              </svg>
              {t('promptTplNewBtn')}
            </button>
            {loading ? (
              <div className="text-center py-8 text-xs text-tM">{t('appLoading')}</div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 px-3">
                <p className="text-xs text-tM">{t('promptTplEmpty')}</p>
              </div>
            ) : (
              templates.map(tpl => (
                <button
                  key={tpl.id}
                  onClick={() => startEdit(tpl)}
                  className={`w-full text-left px-3 py-2 text-xs border-b border-bd/50 transition-colors ${
                    editing?.id === tpl.id ? 'bg-aB/10 text-t1' : 'text-t2 hover:bg-bg2'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="flex-1 truncate font-medium">{tpl.name}</span>
                    {tpl.isDefault && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-aG/15 text-aG font-medium">
                        {t('promptTplDefault')}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-tM mt-0.5 line-clamp-1">{tpl.content}</div>
                </button>
              ))
            )}
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-y-auto p-5">
            {!editing ? (
              <div className="space-y-3">
                {/* Base prompt — read-only reference */}
                <div className="rounded-lg border border-aP/30 bg-aP/5 overflow-hidden">
                  <button
                    onClick={() => setShowBase(!showBase)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-aP/10 transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-aP shrink-0">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <span className="flex-1 text-[11px] font-semibold text-aP">{t('promptTplBaseTitle')}</span>
                    <span className="text-[9px] text-aP/70 uppercase tracking-wider">{t('promptTplBaseReadonly')}</span>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={`w-3.5 h-3.5 text-aP/70 transition-transform ${showBase ? '' : '-rotate-90'}`}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                  {showBase && (
                    <div className="px-3 pb-3 pt-1 max-h-72 overflow-y-auto">
                      <pre className="text-[10px] text-t2 leading-relaxed whitespace-pre-wrap font-mono">{basePrompt || t('appLoading')}</pre>
                    </div>
                  )}
                </div>
                <div className="text-center pt-4">
                  <p className="text-sm text-tM">{t('promptTplPickPrompt')}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-tM text-[10px] font-mono uppercase tracking-wider">
                    {t('promptTplName')}
                  </label>
                  <IMEInput
                    value={draftName}
                    onValueChange={setDraftName}
                    placeholder={t('promptTplNamePlaceholder')}
                    className="w-full bg-bg0 border border-bd rounded px-2 py-1.5 text-t1 text-xs focus:outline-none focus:border-aB transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-tM text-[10px] font-mono uppercase tracking-wider">
                    {t('promptTplContent')}
                  </label>
                  <IMETextarea
                    value={draftContent}
                    onValueChange={setDraftContent}
                    rows={12}
                    placeholder={t('promptTplContentPlaceholder')}
                    className="w-full bg-bg0 border border-bd rounded px-2 py-1.5 text-t1 text-xs focus:outline-none focus:border-aB transition-colors leading-relaxed font-mono"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-t2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draftDefault}
                    onChange={(e) => setDraftDefault(e.target.checked)}
                    className="accent-aB"
                  />
                  {t('promptTplSetDefault')}
                </label>
                <div className="flex items-center justify-between gap-2 pt-2">
                  {editing.id ? (
                    <button
                      onClick={() => handleDelete(editing)}
                      className="text-[11px] px-3 py-1.5 rounded border border-aR/40 text-aR hover:bg-aR/10 transition-colors"
                    >
                      {t('promptTplDelete')}
                    </button>
                  ) : <span />}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditing(null)}
                      className="text-[11px] px-3 py-1.5 rounded border border-bd text-t2 hover:text-t1 transition-colors"
                    >
                      {t('promptTplCancel')}
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving || !draftName.trim() || !draftContent.trim()}
                      className="text-[11px] px-3 py-1.5 rounded bg-gradient-to-r from-aB to-aP text-white hover:opacity-90 disabled:opacity-50 transition-all font-semibold"
                    >
                      {saving ? '…' : t('promptTplSave')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
