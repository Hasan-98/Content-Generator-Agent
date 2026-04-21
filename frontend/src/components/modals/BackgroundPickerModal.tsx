import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext';
import {
  searchSectionBackgroundsApi,
  setSectionBackgroundApi,
  generateSectionImageApi,
} from '../../api/videoScripts';
import type { BackgroundResult } from '../../api/videoScripts';
import type { VideoScriptSection } from '../../types';
import { IMEInput } from '../common/IMEInput';

interface Props {
  section: VideoScriptSection;
  onClose: () => void;
  onPicked: (updated: VideoScriptSection) => void;
}

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  pexels_photo: { label: 'Pexels Photo', color: '#3fb950' },
  pexels_video: { label: 'Pexels Video', color: '#58a6ff' },
  pixabay_video: { label: 'Pixabay Video', color: '#d29922' },
};

export default function BackgroundPickerModal({ section, onClose, onPicked }: Props) {
  const { t } = useLanguage();
  const [query, setQuery] = useState(section.backgroundKeyword || section.heading || '');
  const [results, setResults] = useState<BackgroundResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [picking, setPicking] = useState<string | null>(null);

  // AI generation
  const [aiPrompt, setAiPrompt] = useState(section.imagePrompt || '');
  const [generatingAi, setGeneratingAi] = useState(false);

  // Filter
  const [filter, setFilter] = useState<'all' | 'photo' | 'video'>('all');

  useEffect(() => {
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await searchSectionBackgroundsApi(section.id, query.trim());
      setResults(data.results);
    } catch {
      toast.error(t('bgPickerSearchFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function handlePick(url: string) {
    setPicking(url);
    try {
      const updated = await setSectionBackgroundApi(section.id, url);
      toast.success(t('bgPickerSelected'));
      onPicked(updated);
      onClose();
    } catch {
      toast.error(t('bgPickerSelectFailed'));
    } finally {
      setPicking(null);
    }
  }

  async function handleAiGenerate() {
    if (!aiPrompt.trim()) return;
    setGeneratingAi(true);
    try {
      const updated = await generateSectionImageApi(section.id, aiPrompt.trim());
      toast.success(t('bgPickerAiDone'));
      onPicked(updated);
      onClose();
    } catch {
      toast.error(t('bgPickerAiFailed'));
    } finally {
      setGeneratingAi(false);
    }
  }

  const filtered = results.filter(r => {
    if (filter === 'photo') return r.source === 'pexels_photo';
    if (filter === 'video') return r.source.includes('video');
    return true;
  });

  const photoCount = results.filter(r => r.source === 'pexels_photo').length;
  const videoCount = results.filter(r => r.source.includes('video')).length;

  return (
    <div className="fixed inset-0 bg-bg0/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-bg1 border border-bd rounded-lg w-full max-w-3xl max-h-[85vh] shadow-xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3 border-b border-bd flex items-center justify-between shrink-0">
          <div>
            <div className="text-sm text-t1 font-semibold">{t('bgPickerTitle')}</div>
            <div className="text-[11px] text-tM mt-0.5">{section.heading}</div>
          </div>
          <button onClick={onClose} className="text-tM hover:text-t1 transition-colors text-lg leading-none">&times;</button>
        </div>

        {/* Search bar */}
        <div className="px-5 py-3 border-b border-bd flex gap-2 shrink-0">
          <IMEInput
            value={query}
            onValueChange={setQuery}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder={t('bgPickerSearchPlaceholder')}
            className="flex-1 bg-bg0 border border-bd rounded px-3 py-1.5 text-sm text-t1 focus:outline-none focus:border-aB"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-4 py-1.5 text-xs bg-aB/20 text-aB border border-aB/40 rounded hover:bg-aB/30 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? t('bgPickerSearching') : t('bgPickerSearchBtn')}
          </button>
        </div>

        {/* Filter tabs */}
        {results.length > 0 && (
          <div className="px-5 py-2 border-b border-bd flex gap-2 shrink-0">
            <button
              onClick={() => setFilter('all')}
              className={`text-[11px] px-2.5 py-1 rounded transition-colors ${filter === 'all' ? 'bg-bg2 text-t1' : 'text-tM hover:text-t2'}`}
            >
              {t('bgPickerAll')} ({results.length})
            </button>
            <button
              onClick={() => setFilter('photo')}
              className={`text-[11px] px-2.5 py-1 rounded transition-colors ${filter === 'photo' ? 'bg-aG/15 text-aG' : 'text-tM hover:text-t2'}`}
            >
              {t('bgPickerPhotos')} ({photoCount})
            </button>
            <button
              onClick={() => setFilter('video')}
              className={`text-[11px] px-2.5 py-1 rounded transition-colors ${filter === 'video' ? 'bg-aB/15 text-aB' : 'text-tM hover:text-t2'}`}
            >
              {t('bgPickerVideos')} ({videoCount})
            </button>
          </div>
        )}

        {/* Results grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-tM text-sm">{t('bgPickerSearching')}</div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <div className="text-sm text-t2 mb-1">{t('bgPickerEmpty')}</div>
              <div className="text-[11px] text-tM">{t('bgPickerEmptyHint')}</div>
            </div>
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
              {filtered.map((r, i) => {
                const src = SOURCE_LABELS[r.source];
                const isVideo = r.source.includes('video');
                return (
                  <button
                    key={`${r.source}-${i}`}
                    onClick={() => handlePick(isVideo ? r.url : r.url)}
                    disabled={picking !== null}
                    className={`group relative rounded-lg border overflow-hidden text-left transition-all ${
                      picking === r.url
                        ? 'border-aB ring-2 ring-aB/30'
                        : 'border-bd hover:border-aB/60'
                    }`}
                  >
                    <div className="aspect-video bg-bg0 relative">
                      <img
                        src={r.thumbnail || r.url}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {/* Source badge */}
                      <span
                        className="absolute top-1.5 left-1.5 text-[9px] px-1.5 py-0.5 rounded font-mono"
                        style={{ background: src.color + '22', color: src.color }}
                      >
                        {src.label}
                      </span>
                      {/* Video duration */}
                      {isVideo && r.duration && (
                        <span className="absolute bottom-1.5 right-1.5 text-[9px] px-1.5 py-0.5 rounded bg-bg0/80 text-t1 font-mono">
                          {r.duration}s
                        </span>
                      )}
                      {/* Play icon overlay for videos */}
                      {isVideo && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-8 h-8 rounded-full bg-bg0/60 flex items-center justify-center">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-t1 ml-0.5">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </div>
                      )}
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-aB/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {picking === r.url && (
                      <div className="absolute inset-0 bg-bg0/60 flex items-center justify-center">
                        <span className="text-xs text-aB font-medium">{t('bgPickerSelecting')}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* AI generation section */}
        <div className="px-5 py-3 border-t border-bd shrink-0">
          <div className="text-[11px] text-t2 font-medium mb-2">{t('bgPickerAiSection')}</div>
          <div className="flex gap-2">
            <IMEInput
              value={aiPrompt}
              onValueChange={setAiPrompt}
              placeholder={t('bgPickerAiPlaceholder')}
              className="flex-1 bg-bg0 border border-bd rounded px-3 py-1.5 text-sm text-t1 focus:outline-none focus:border-aP"
            />
            <button
              onClick={handleAiGenerate}
              disabled={generatingAi || !aiPrompt.trim()}
              className="px-4 py-1.5 text-xs bg-aP/20 text-aP border border-aP/40 rounded hover:bg-aP/30 disabled:opacity-50 transition-colors font-medium whitespace-nowrap"
            >
              {generatingAi ? t('bgPickerAiGenerating') : t('bgPickerAiBtn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
