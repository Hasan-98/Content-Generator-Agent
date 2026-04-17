import { useState, useRef, useCallback, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import type { ArticleImage, ImageTaste } from '../../types';
import { generateImage as generateImageApi } from '../../api/generate';
import { updateImage, selectHistoryImage } from '../../api/articles';
import toast from 'react-hot-toast';

interface Props {
  image: ArticleImage;
  sectionHeading: string;
  sectionType: string;
  articleId: string;
  onUpdate: (image: ArticleImage) => void;
}

const TASTE_OPTIONS: { value: ImageTaste; labelKey: 'imageTastePhoto' | 'imageTasteTextOverlay' | 'imageTasteInfographic' | 'imageTasteIllustration' | 'imageTasteCinematic' }[] = [
  { value: 'PHOTO', labelKey: 'imageTastePhoto' },
  { value: 'TEXT_OVERLAY', labelKey: 'imageTasteTextOverlay' },
  { value: 'INFOGRAPHIC', labelKey: 'imageTasteInfographic' },
  { value: 'ILLUSTRATION', labelKey: 'imageTasteIllustration' },
  { value: 'CINEMATIC', labelKey: 'imageTasteCinematic' },
];

const DEFAULT_PROMPTS: Record<ImageTaste, string> = {
  PHOTO: 'ノートパソコンでコンテンツを読む人物のリアルな写真、モダンなオフィス、自然光',
  TEXT_OVERLAY: '日本語テキストオーバーレイ用のクリーンなミニマリスト背景',
  INFOGRAPHIC: 'アイコンとデータ可視化要素を含むフラットデザインのインフォグラフィックレイアウト',
  ILLUSTRATION: '記事のトピックに関連するカラフルなデジタルイラスト',
  CINEMATIC: 'ドラマチックな照明と浅い被写界深度のシネマティックなワイドショット',
};

// Built-in variations per taste, plus user-added ones loaded from localStorage.
type Variation = { name: string; prompt: string };

const BUILTIN_VARIATIONS: Record<ImageTaste, Variation[]> = {
  PHOTO: [
    { name: 'Realistic photo', prompt: DEFAULT_PROMPTS.PHOTO },
  ],
  TEXT_OVERLAY: [
    { name: 'Text overlay', prompt: DEFAULT_PROMPTS.TEXT_OVERLAY },
  ],
  INFOGRAPHIC: [
    { name: 'Infographic', prompt: DEFAULT_PROMPTS.INFOGRAPHIC },
    { name: 'Infographic with text', prompt: 'アイコン、ラベル、見出しテキスト付きのフラットデザインインフォグラフィック。日本語テキストを含む、データ可視化、明確な階層、プロフェッショナルなレイアウト' },
  ],
  ILLUSTRATION: [
    { name: 'Illustration', prompt: DEFAULT_PROMPTS.ILLUSTRATION },
  ],
  CINEMATIC: [
    { name: 'Cinematic', prompt: DEFAULT_PROMPTS.CINEMATIC },
  ],
};

const VARIATIONS_KEY = 'imageTasteVariations.v1';

function loadCustomVariations(): Record<ImageTaste, Variation[]> {
  try {
    const raw = localStorage.getItem(VARIATIONS_KEY);
    if (!raw) return { PHOTO: [], TEXT_OVERLAY: [], INFOGRAPHIC: [], ILLUSTRATION: [], CINEMATIC: [] };
    return JSON.parse(raw);
  } catch {
    return { PHOTO: [], TEXT_OVERLAY: [], INFOGRAPHIC: [], ILLUSTRATION: [], CINEMATIC: [] };
  }
}

function saveCustomVariations(v: Record<ImageTaste, Variation[]>) {
  try { localStorage.setItem(VARIATIONS_KEY, JSON.stringify(v)); } catch { /* ignore */ }
}

export default function ImageCard({ image, sectionHeading, sectionType, articleId, onUpdate }: Props) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [selectingHistory, setSelectingHistory] = useState(false);
  const [localPrompt, setLocalPrompt] = useState(image.prompt);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [openDropdown, setOpenDropdown] = useState<ImageTaste | null>(null);
  const [customVariations, setCustomVariations] = useState<Record<ImageTaste, Variation[]>>(loadCustomVariations);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    if (openDropdown) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [openDropdown]);

  function getVariations(taste: ImageTaste): Variation[] {
    return [...BUILTIN_VARIATIONS[taste], ...(customVariations[taste] || [])];
  }

  async function handleSelectVariation(taste: ImageTaste, v: Variation) {
    setOpenDropdown(null);
    try {
      const updated = await updateImage(articleId, image.index, { taste, prompt: v.prompt });
      onUpdate(updated);
    } catch {
      toast.error(t('toastUpdateFailed'));
    }
  }

  function handleAddVariation(taste: ImageTaste) {
    const name = window.prompt(t('imageVariationNamePrompt'));
    if (!name) return;
    const promptText = window.prompt(t('imageVariationPromptPrompt'));
    if (!promptText) return;
    const next = {
      ...customVariations,
      [taste]: [...(customVariations[taste] || []), { name, prompt: promptText }],
    };
    setCustomVariations(next);
    saveCustomVariations(next);
  }

  // Track whether the user is actively editing so we don't clobber their input
  // when the debounced save's response triggers a parent state update.
  const editingRef = useRef(false);

  // Sync local prompt when image prop changes externally (taste change, reset, etc.)
  // but NOT when the change came from the user's own debounced save.
  useEffect(() => {
    if (!editingRef.current) {
      setLocalPrompt(image.prompt);
    }
  }, [image.prompt]);

  const debouncedPromptSave = useCallback((prompt: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    editingRef.current = true;
    debounceRef.current = setTimeout(async () => {
      try {
        await updateImage(articleId, image.index, { prompt });
        // Don't call onUpdate here — it would trigger the useEffect sync
        // and clobber any characters typed after the debounce fired.
      } catch {
        toast.error(t('toastUpdateFailed'));
      } finally {
        editingRef.current = false;
      }
    }, 600);
  }, [articleId, image.index, t]);

  async function handleSelectHistory(historyId: string) {
    setSelectingHistory(true);
    try {
      const updated = await selectHistoryImage(articleId, image.index, historyId);
      onUpdate(updated);
      toast.success('画像を選択しました');
    } catch {
      toast.error('画像の選択に失敗しました');
    } finally {
      setSelectingHistory(false);
    }
  }

  async function handleToggleEnabled(enabled: boolean) {
    try {
      const updated = await updateImage(articleId, image.index, { enabled });
      onUpdate(updated);
    } catch {
      toast.error(t('toastUpdateFailed'));
    }
  }

  async function handleTasteChange(taste: ImageTaste) {
    try {
      const updated = await updateImage(articleId, image.index, { taste, prompt: DEFAULT_PROMPTS[taste] });
      onUpdate(updated);
    } catch {
      toast.error(t('toastUpdateFailed'));
    }
  }

  async function handlePromptChange(prompt: string) {
    try {
      const updated = await updateImage(articleId, image.index, { prompt });
      onUpdate(updated);
    } catch {
      toast.error(t('toastUpdateFailed'));
    }
  }

  async function handleGenerate() {
    setLoading(true);
    try {
      const updated = await generateImageApi(articleId, image.index);
      onUpdate(updated);
      toast.success(t('toastImageGenDone'));
    } catch {
      toast.error(t('toastImageGenFailed'));
    } finally {
      setLoading(false);
    }
  }

  const TYPE_COLOR: Record<string, string> = {
    intro: '#58a6ff', nayami: '#d29922', point: '#bc8cff',
    common: '#39d2c0', cta: '#3fb950', matome: '#f778ba',
  };
  const color = TYPE_COLOR[sectionType] ?? '#8b949e';

  return (
    <div className={`rounded-lg border border-bd bg-bg1 mb-3 overflow-hidden ${!image.enabled ? 'opacity-50' : ''}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-bd">
        <span className="text-xs font-mono text-tM">画像{image.index + 1}</span>
        <span className="text-xs text-t2 flex-1 truncate">{sectionHeading}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${color}22`, color }}>
          {sectionType}
        </span>
        {/* Enable/Disable toggle */}
        <div className="flex rounded-md overflow-hidden border border-bd">
          <button
            onClick={() => handleToggleEnabled(true)}
            className={`text-[10px] px-2 py-0.5 transition-colors ${image.enabled ? 'bg-aG/20 text-aG' : 'text-tM hover:text-t2'}`}
          >
            {t('imageEnableBtn')}
          </button>
          <button
            onClick={() => handleToggleEnabled(false)}
            className={`text-[10px] px-2 py-0.5 transition-colors border-l border-bd ${!image.enabled ? 'bg-aR/20 text-aR' : 'text-tM hover:text-t2'}`}
          >
            {t('imageDisableBtn')}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className={`p-4 ${!image.enabled ? 'pointer-events-none' : ''}`}>
        <div className="flex gap-4">
          {/* Left: controls */}
          <div className="flex-1 min-w-0">
            {/* Taste dropdown buttons */}
            <div className="flex flex-wrap gap-1 mb-3 relative" ref={dropdownRef}>
              {TASTE_OPTIONS.map((opt) => {
                const active = image.taste === opt.value;
                const isOpen = openDropdown === opt.value;
                const variations = getVariations(opt.value);
                return (
                  <div key={opt.value} className="relative">
                    <button
                      onClick={() => {
                        if (!active) handleTasteChange(opt.value);
                        setOpenDropdown(isOpen ? null : opt.value);
                      }}
                      className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        active
                          ? 'border-aB bg-aB/20 text-aB'
                          : 'border-bd text-t2 hover:border-aB hover:text-aB'
                      }`}
                    >
                      <span>{t(opt.labelKey)}</span>
                      <svg width="8" height="8" viewBox="0 0 8 8" className="opacity-70">
                        <path d="M1 2.5 L4 5.5 L7 2.5" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="absolute z-20 mt-1 left-0 min-w-[200px] rounded-lg border border-bd bg-bg2 shadow-lg overflow-hidden">
                        {variations.map((v, i) => (
                          <button
                            key={`${v.name}-${i}`}
                            onClick={() => handleSelectVariation(opt.value, v)}
                            className="w-full text-left text-xs px-3 py-2 text-t1 hover:bg-aB/20 hover:text-aB transition-colors"
                          >
                            {v.name}
                          </button>
                        ))}
                        <button
                          onClick={() => handleAddVariation(opt.value)}
                          className="w-full text-left text-xs px-3 py-2 text-t2 border-t border-bd hover:bg-bg1 hover:text-aB transition-colors"
                        >
                          {t('imageVariationAdd')}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Prompt */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-t2">{t('imagePromptLabel')}</span>
                <button
                  onClick={() => handlePromptChange(DEFAULT_PROMPTS[image.taste])}
                  className="text-[10px] text-aB hover:underline"
                >
                  {t('imagePromptReset')}
                </button>
              </div>
              <textarea
                value={localPrompt}
                onChange={(e) => {
                  setLocalPrompt(e.target.value);
                  debouncedPromptSave(e.target.value);
                }}
                rows={3}
                className="w-full bg-bg0 border border-bd rounded px-2 py-1.5 text-xs text-t1 resize-none focus:outline-none focus:border-aB"
              />
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded bg-aP/20 text-aP border border-aP/40 hover:bg-aP/30 disabled:opacity-50 transition-colors"
            >
              {loading ? '生成中…' : image.imageUrl ? t('imageRegenBtn') : t('imageGenBtn')}
            </button>
          </div>

          {/* Right: preview */}
          <div
            className="rounded-lg border border-bd bg-bg0 flex items-center justify-center overflow-hidden shrink-0"
            style={{ width: 200, height: 140 }}
          >
            {image.imageUrl ? (
              <img src={image.imageUrl} alt={sectionHeading} className="w-full h-full object-cover" />
            ) : (
              <div className="text-center">
                <div className="text-2xl mb-1">🖼</div>
                <div className="text-[10px] text-tM">未生成</div>
              </div>
            )}
          </div>
        </div>

        {/* History thumbnails */}
        {image.history && image.history.length > 0 && (
          <div className="mt-3 pt-3 border-t border-bd">
            <div className="text-[10px] text-t2 mb-2">過去の生成画像 ({image.history.length})</div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {image.history.map((h) => (
                <button
                  key={h.id}
                  onClick={() => handleSelectHistory(h.id)}
                  disabled={selectingHistory}
                  className="shrink-0 rounded border border-bd hover:border-aB overflow-hidden transition-colors disabled:opacity-50 group relative"
                  style={{ width: 60, height: 42 }}
                  title={`${new Date(h.createdAt).toLocaleString('ja-JP')} — クリックで選択`}
                >
                  <img src={h.imageUrl} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-bg0/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-[9px] text-t1 font-medium">選択</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
