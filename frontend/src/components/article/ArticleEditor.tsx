import { useState, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import type { Article, GeneratedResult } from '../../types';
import SectionCard from './SectionCard';
import { regenerateSection, regenerateSectionHeading, regenerateTitle } from '../../api/generate';
import { updateSection } from '../../api/articles';
import { updateResult } from '../../api/results';
import { IMEInput } from '../common/IMEInput';
import toast from 'react-hot-toast';

interface Props {
  article: Article;
  result: GeneratedResult;
  onArticleUpdate: (article: Article) => void;
  onResultUpdate: (result: GeneratedResult) => void;
  onNext: () => void;
  onOpenRef: () => void;
}

export default function ArticleEditor({ article, result, onArticleUpdate, onResultUpdate, onNext, onOpenRef }: Props) {
  const { t } = useLanguage();
  const [regeneratingTitle, setRegeneratingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(result.title);
  const titleInputRef = useRef<HTMLInputElement>(null);

  async function handleRegenTitle() {
    setRegeneratingTitle(true);
    try {
      const updated = await regenerateTitle(result.id);
      onResultUpdate(updated);
      toast.success(t('toastTitleRegenDone'));
    } catch {
      toast.error(t('toastTitleRegenFailed'));
    } finally {
      setRegeneratingTitle(false);
    }
  }

  function startEditTitle() {
    setTitleDraft(result.title);
    setEditingTitle(true);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  }

  async function commitTitleEdit() {
    setEditingTitle(false);
    const trimmed = titleDraft.trim();
    if (!trimmed || trimmed === result.title) return;
    try {
      const updated = await updateResult(result.id, { title: trimmed });
      onResultUpdate(updated);
      toast.success(t('toastTitleUpdated'));
    } catch {
      toast.error(t('toastUpdateFailed'));
    }
  }

  async function handleRegenSection(index: number, instruction?: string) {
    try {
      const updated = await regenerateSection(article.id, index, instruction);
      onArticleUpdate({
        ...article,
        sections: article.sections.map(s => s.index === index ? { ...s, content: updated.content } : s),
      });
      toast.success(t('toastSectionRegenDone'));
    } catch {
      toast.error(t('detailRegenFailed'));
    }
  }

  async function handleContentChange(index: number, content: string) {
    const updated = await updateSection(article.id, index, { content });
    onArticleUpdate({
      ...article,
      sections: article.sections.map(s => s.index === index ? { ...s, ...updated } : s),
    });
  }

  async function handleHeadingChange(index: number, heading: string) {
    try {
      const updated = await updateSection(article.id, index, { heading });
      onArticleUpdate({
        ...article,
        sections: article.sections.map(s => s.index === index ? { ...s, ...updated } : s),
      });
    } catch {
      toast.error(t('toastUpdateFailed'));
    }
  }

  async function handleRegenHeading(index: number) {
    try {
      const updated = await regenerateSectionHeading(article.id, index);
      onArticleUpdate({
        ...article,
        sections: article.sections.map(s => s.index === index ? { ...s, heading: updated.heading } : s),
      });
      toast.success(t('toastHeadingRegenDone'));
    } catch {
      toast.error(t('detailTitleRegenFailed'));
    }
  }

  const totalChars = article.sections.reduce((sum, s) => sum + s.content.length, 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="px-5 py-3 border-b border-bd flex items-center gap-3 shrink-0 bg-bg1">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-t2 font-mono truncate">{result.keywordText}</div>
          <div className="flex items-center gap-2">
            {editingTitle ? (
              <IMEInput
                ref={titleInputRef}
                value={titleDraft}
                onValueChange={setTitleDraft}
                onBlur={commitTitleEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitTitleEdit();
                  if (e.key === 'Escape') { setEditingTitle(false); setTitleDraft(result.title); }
                }}
                className="flex-1 text-sm text-t1 font-semibold bg-bg0 border border-aB rounded px-2 py-0.5 focus:outline-none"
              />
            ) : (
              <div
                onClick={startEditTitle}
                className="text-sm text-t1 font-semibold truncate cursor-text hover:text-aB transition-colors"
                title={t('titleClickToEdit')}
              >
                {result.title}
              </div>
            )}
            <button
              onClick={handleRegenTitle}
              disabled={regeneratingTitle}
              className="shrink-0 text-[10px] px-2 py-0.5 rounded border border-aO/50 text-aO hover:bg-aO/10 disabled:opacity-50 transition-colors"
              title={t('titleRegenTooltip')}
            >
              {regeneratingTitle ? '…' : t('titleRegenBtn')}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-tM">{totalChars.toLocaleString()} 文字</span>
          <button
            onClick={onOpenRef}
            className="text-xs px-3 py-1.5 rounded border border-aP/50 text-aP hover:bg-aP/10 transition-colors"
          >
            {t('articleReferenceBtn')}
          </button>
          <button
            onClick={onNext}
            className="text-xs px-3 py-1.5 rounded bg-aG/20 text-aG border border-aG/40 hover:bg-aG/30 transition-colors font-medium"
          >
            {t('articleNextToImages')}
          </button>
        </div>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto p-5">
        {article.sections.map((section) => (
          <SectionCard
            key={section.id}
            section={section}
            onRegenerate={handleRegenSection}
            onContentChange={handleContentChange}
            onHeadingChange={handleHeadingChange}
            onRegenerateHeading={handleRegenHeading}
          />
        ))}
      </div>
    </div>
  );
}
