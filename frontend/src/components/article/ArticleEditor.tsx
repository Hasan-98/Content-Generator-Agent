import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import type { Article, GeneratedResult } from '../../types';
import SectionCard from './SectionCard';
import { regenerateSection, regenerateSectionHeading, regenerateTitle } from '../../api/generate';
import { updateSection } from '../../api/articles';
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

  async function handleRegenSection(index: number, instruction?: string) {
    try {
      const updated = await regenerateSection(article.id, index, instruction);
      onArticleUpdate({
        ...article,
        sections: article.sections.map(s => s.index === index ? { ...s, content: updated.content } : s),
      });
      toast.success(t('toastSectionRegenDone'));
    } catch {
      toast.error('セクションの再生成に失敗しました');
    }
  }

  async function handleContentChange(index: number, content: string) {
    try {
      const updated = await updateSection(article.id, index, { content });
      onArticleUpdate({
        ...article,
        sections: article.sections.map(s => s.index === index ? { ...s, ...updated } : s),
      });
    } catch {
      toast.error(t('toastUpdateFailed'));
    }
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
      toast.error('タイトルの再生成に失敗しました');
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
            <div className="text-sm text-t1 font-semibold truncate">{result.title}</div>
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
