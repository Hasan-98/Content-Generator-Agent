import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { TopLevel, VideoScript, TtsDictionary, HeygenAvatar } from '../types';
import { getTopLevels } from '../api/topics';
import {
  listVideoScripts, generateVideoScriptApi, deleteVideoScript, updateVideoScriptSection,
  generateTtsApi, listTtsDictionary, addTtsDictionaryEntry, deleteTtsDictionaryEntry,
  generateHeygenVideoApi, checkHeygenStatusApi,
  generateRemotionVideoApi, checkRemotionStatusApi,
  listAvatarsApi, updateVideoSettingsApi,
} from '../api/videoScripts';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

const SECTION_TYPE_COLORS: Record<string, string> = {
  general: '#58a6ff',
  process: '#d29922',
  comparison: '#bc8cff',
};

const VISUAL_TYPE_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  avatar:  { color: '#3fb950', icon: '👤', label: 'Avatar' },
  scenery: { color: '#d29922', icon: '🏞', label: 'Scenery' },
  closeup: { color: '#f85149', icon: '🔍', label: 'Closeup' },
  split:   { color: '#bc8cff', icon: '◧', label: 'Split' },
};

const AUDIO_STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  pending:    { color: '#8b949e', label: '未生成' },
  generating: { color: '#d29922', label: '生成中…' },
  preparing:  { color: '#d29922', label: '準備中…' },
  processing: { color: '#d29922', label: '処理中…' },
  rendering:  { color: '#d29922', label: 'レンダリング中…' },
  done:       { color: '#3fb950', label: '生成済' },
  completed:  { color: '#3fb950', label: '完了' },
  failed:     { color: '#f85149', label: '失敗' },
};

const THEMES: { id: string; name: string; colors: [string, string]; desc: string }[] = [
  { id: 'modern-dark',     name: 'Modern Dark',      colors: ['#0d1117', '#58a6ff'], desc: 'Dark bg, blue accents' },
  { id: 'modern-light',    name: 'Modern Light',     colors: ['#ffffff', '#2563eb'], desc: 'Clean white, blue text' },
  { id: 'neon-glow',       name: 'Neon Glow',        colors: ['#0a0a0a', '#00ff88'], desc: 'Black bg, neon green' },
  { id: 'sunset-warm',     name: 'Sunset Warm',      colors: ['#1a0a00', '#ff6b35'], desc: 'Warm orange tones' },
  { id: 'ocean-calm',      name: 'Ocean Calm',       colors: ['#0c1929', '#39d2c0'], desc: 'Deep blue, cyan accents' },
  { id: 'sakura',          name: 'Sakura',           colors: ['#1a0a14', '#ff69b4'], desc: 'Dark bg, pink accents' },
  { id: 'forest-green',    name: 'Forest Green',     colors: ['#0a1a0a', '#3fb950'], desc: 'Dark green theme' },
  { id: 'royal-purple',    name: 'Royal Purple',     colors: ['#120a1a', '#bc8cff'], desc: 'Purple luxury feel' },
  { id: 'fire-red',        name: 'Fire Red',         colors: ['#1a0a0a', '#f85149'], desc: 'Bold red accents' },
  { id: 'golden',          name: 'Golden',           colors: ['#1a1400', '#d29922'], desc: 'Gold luxury style' },
  { id: 'minimal-mono',    name: 'Minimal Mono',     colors: ['#111111', '#e6edf3'], desc: 'Black & white minimal' },
  { id: 'gradient-blue',   name: 'Gradient Blue',    colors: ['#0f172a', '#3b82f6'], desc: 'Blue gradient overlay' },
  { id: 'gradient-purple',  name: 'Gradient Purple', colors: ['#1e1033', '#8b5cf6'], desc: 'Purple gradient' },
  { id: 'retro-amber',     name: 'Retro Amber',     colors: ['#1a1000', '#fbbf24'], desc: 'Amber retro style' },
  { id: 'ice-blue',        name: 'Ice Blue',         colors: ['#0a1929', '#7dd3fc'], desc: 'Cool ice blue tones' },
];

export default function VideoScriptCreator() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [topLevels, setTopLevels] = useState<TopLevel[]>([]);
  const [scripts, setScripts] = useState<VideoScript[]>([]);
  const [selectedScript, setSelectedScript] = useState<VideoScript | null>(null);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingTts, setGeneratingTts] = useState(false);
  const [generatingHeygen, setGeneratingHeygen] = useState(false);
  const [generatingRemotion, setGeneratingRemotion] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  // Avatars & Settings
  const [avatars, setAvatars] = useState<HeygenAvatar[]>([]);
  const [avatarsLoaded, setAvatarsLoaded] = useState(false);
  // Dictionary
  const [dictOpen, setDictOpen] = useState(false);
  const [dictEntries, setDictEntries] = useState<TtsDictionary[]>([]);
  const [newKanji, setNewKanji] = useState('');
  const [newReading, setNewReading] = useState('');

  // Load data
  useEffect(() => {
    Promise.all([getTopLevels(), listVideoScripts()])
      .then(([tl, vs]) => {
        setTopLevels(tl);
        setScripts(vs);
      })
      .catch(() => toast.error(t('vsLoadFailed')))
      .finally(() => setLoading(false));
  }, [user?.id]);

  // Get articles that have content (ARTICLE_DONE or later)
  const articleItems = topLevels.flatMap((tl) =>
    tl.keywords.flatMap((kw) =>
      kw.results
        .filter((r) => r.article && ['ARTICLE_DONE', 'IMAGING', 'IMAGE_DONE', 'FORMATTING', 'FORMAT_DONE', 'UPLOADED'].includes(r.article.status))
        .map((r) => ({ tl, kw, result: r }))
    )
  );

  function getScriptForArticle(articleId: string) {
    return scripts.find((s) => s.articleId === articleId);
  }

  function updateScriptInState(updated: VideoScript) {
    setScripts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    if (selectedScript?.id === updated.id) setSelectedScript(updated);
  }

  async function handleGenerate() {
    if (!selectedArticleId) return;
    setGenerating(true);
    toast.loading(t('vsGenerating'), { id: 'gen-vs' });
    try {
      const script = await generateVideoScriptApi(selectedArticleId);
      setScripts((prev) => {
        const filtered = prev.filter((s) => s.articleId !== selectedArticleId);
        return [script, ...filtered];
      });
      setSelectedScript(script);
      toast.success(t('vsGenerated'), { id: 'gen-vs' });
    } catch {
      toast.error(t('vsGenFailed'), { id: 'gen-vs' });
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerateTts() {
    if (!selectedScript) return;
    setGeneratingTts(true);
    toast.loading(t('ttsGenerating'), { id: 'gen-tts' });
    try {
      const updated = await generateTtsApi(selectedScript.id);
      updateScriptInState(updated);
      toast.success(t('ttsGenerated'), { id: 'gen-tts' });
    } catch {
      toast.error(t('ttsGenFailed'), { id: 'gen-tts' });
    } finally {
      setGeneratingTts(false);
    }
  }

  async function handleGenerateHeygen() {
    if (!selectedScript) return;
    setGeneratingHeygen(true);
    toast.loading(t('heygenGenerating'), { id: 'gen-heygen' });
    try {
      const updated = await generateHeygenVideoApi(selectedScript.id);
      updateScriptInState(updated);
      toast.success(t('heygenStarted'), { id: 'gen-heygen' });
    } catch {
      toast.error(t('heygenFailed'), { id: 'gen-heygen' });
    } finally {
      setGeneratingHeygen(false);
    }
  }

  async function handleCheckHeygen() {
    if (!selectedScript) return;
    try {
      const updated = await checkHeygenStatusApi(selectedScript.id);
      updateScriptInState(updated);
      if (updated.heygenStatus === 'done') {
        toast.success(t('heygenDone'));
      } else {
        toast(t('heygenStillProcessing'));
      }
    } catch {
      toast.error(t('heygenCheckFailed'));
    }
  }

  async function handleGenerateRemotion() {
    if (!selectedScript) return;
    setGeneratingRemotion(true);
    toast.loading(t('remotionGenerating'), { id: 'gen-remotion' });
    try {
      const updated = await generateRemotionVideoApi(selectedScript.id);
      updateScriptInState(updated);
      toast.success(t('remotionStarted'), { id: 'gen-remotion' });
    } catch {
      toast.error(t('remotionFailed'), { id: 'gen-remotion' });
    } finally {
      setGeneratingRemotion(false);
    }
  }

  async function handleCheckRemotion() {
    if (!selectedScript) return;
    try {
      const updated = await checkRemotionStatusApi(selectedScript.id);
      updateScriptInState(updated);
      if (updated.remotionStatus === 'done') {
        toast.success(t('remotionDone'));
      } else {
        toast(t('remotionStillProcessing'));
      }
    } catch {
      toast.error(t('remotionCheckFailed'));
    }
  }

  async function loadAvatars() {
    if (avatarsLoaded) return;
    try {
      const list = await listAvatarsApi();
      setAvatars(list);
      setAvatarsLoaded(true);
    } catch {
      toast.error(t('avatarLoadFailed'));
    }
  }

  async function handleUpdateSettings(data: { avatarId?: string; orientation?: string; theme?: string }) {
    if (!selectedScript) return;
    try {
      const updated = await updateVideoSettingsApi(selectedScript.id, data);
      updateScriptInState(updated);
    } catch {
      toast.error(t('settingsSaveFailed'));
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteVideoScript(id);
      setScripts((prev) => prev.filter((s) => s.id !== id));
      if (selectedScript?.id === id) setSelectedScript(null);
      toast.success(t('vsDeleted'));
    } catch {
      toast.error(t('vsDeleteFailed'));
    }
  }

  async function handleSaveSection(sectionId: string) {
    const narration = editValues[`narration-${sectionId}`];
    const heading = editValues[`heading-${sectionId}`];
    const points = editValues[`points-${sectionId}`];
    const visualType = editValues[`visualType-${sectionId}`];
    const visualNote = editValues[`visualNote-${sectionId}`];

    try {
      const updated = await updateVideoScriptSection(sectionId, {
        ...(narration !== undefined && { narration }),
        ...(heading !== undefined && { heading }),
        ...(points !== undefined && { points }),
        ...(visualType !== undefined && { visualType }),
        ...(visualNote !== undefined && { visualNote }),
      });
      setSelectedScript((prev) => {
        if (!prev) return prev;
        return { ...prev, sections: prev.sections.map((s) => (s.id === sectionId ? { ...s, ...updated } : s)) };
      });
      setScripts((prev) =>
        prev.map((vs) => ({ ...vs, sections: vs.sections.map((s) => (s.id === sectionId ? { ...s, ...updated } : s)) }))
      );
      setEditingSection(null);
      toast.success(t('vsSectionSaved'));
    } catch {
      toast.error(t('vsSectionSaveFailed'));
    }
  }

  // Dictionary handlers
  async function openDictionary() {
    setDictOpen(true);
    try {
      const entries = await listTtsDictionary();
      setDictEntries(entries);
    } catch {
      toast.error(t('ttsDictLoadFailed'));
    }
  }

  async function handleAddDictEntry() {
    if (!newKanji.trim() || !newReading.trim()) return;
    try {
      const entry = await addTtsDictionaryEntry(newKanji.trim(), newReading.trim());
      setDictEntries((prev) => [...prev, entry]);
      setNewKanji('');
      setNewReading('');
    } catch {
      toast.error(t('ttsDictAddFailed'));
    }
  }

  async function handleDeleteDictEntry(id: string) {
    try {
      await deleteTtsDictionaryEntry(id);
      setDictEntries((prev) => prev.filter((e) => e.id !== id));
    } catch {
      toast.error(t('ttsDictDeleteFailed'));
    }
  }

  const apiBaseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-t2 text-sm">{t('appLoading')}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 bg-bg1 border-r border-bd flex flex-col overflow-hidden shrink-0">
        <div className="h-8 border-b border-bd flex items-center px-3 shrink-0">
          <span className="text-[11px] font-mono text-tM uppercase tracking-wider">{t('vsSidebarHeader')}</span>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {scripts.length > 0 && (
            <div className="mb-3">
              <div className="px-3 py-1.5 text-[10px] font-semibold text-aG uppercase tracking-wider">{t('vsExistingScripts')}</div>
              {scripts.map((vs) => {
                const audioSt = AUDIO_STATUS_CONFIG[vs.audioStatus] || AUDIO_STATUS_CONFIG.pending;
                return (
                  <button
                    key={vs.id}
                    onClick={() => { setSelectedScript(vs); setSelectedArticleId(vs.articleId); }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                      selectedScript?.id === vs.id ? 'bg-bg2 text-t1' : 'text-t2 hover:bg-bg2/50 hover:text-t1'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-aP">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                      <span className="truncate flex-1">{vs.title}</span>
                      {vs.audioStatus === 'done' && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3fb950" strokeWidth="2" className="shrink-0">
                          <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                        </svg>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-tM mt-0.5 pl-[22px]">
                      <span>{vs.sections.length} {t('vsSections')}</span>
                      <span style={{ color: audioSt.color }}>{audioSt.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="px-3 py-1.5 text-[10px] font-semibold text-aO uppercase tracking-wider">{t('vsAvailableArticles')}</div>
          {articleItems.length === 0 ? (
            <div className="text-center py-8 px-4">
              <p className="text-xs text-tM">{t('vsNoArticles')}</p>
            </div>
          ) : (
            articleItems.map(({ result }) => {
              const hasScript = result.article ? !!getScriptForArticle(result.article.id) : false;
              return (
                <button
                  key={result.id}
                  onClick={() => {
                    setSelectedArticleId(result.article!.id);
                    const existing = getScriptForArticle(result.article!.id);
                    setSelectedScript(existing || null);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                    selectedArticleId === result.article?.id ? 'bg-bg2 text-t1' : 'text-t2 hover:bg-bg2/50 hover:text-t1'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${hasScript ? 'bg-aG' : 'bg-tM'}`} />
                    <span className="truncate">{result.title}</span>
                  </div>
                  <div className="text-[10px] text-tM mt-0.5 pl-4">{result.keywordText}</div>
                </button>
              );
            })
          )}
        </div>

        {/* Dictionary button at bottom of sidebar */}
        <div className="border-t border-bd p-2 shrink-0">
          <button
            onClick={openDictionary}
            className="w-full px-3 py-1.5 text-[10px] text-t2 hover:text-t1 bg-bg2 hover:bg-bg2/80 rounded transition-colors flex items-center gap-2 justify-center"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            {t('ttsDictBtn')}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto bg-bg0">
        {!selectedArticleId ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 text-tM">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <p className="text-sm text-tM">{t('vsSelectArticle')}</p>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-lg font-semibold text-t1">
                  {selectedScript ? selectedScript.title : t('vsNewScript')}
                </h1>
                <p className="text-xs text-tM mt-1">
                  {selectedScript
                    ? `${selectedScript.sections.length} ${t('vsSections')} • ${t('vsCreated')} ${new Date(selectedScript.createdAt).toLocaleDateString()}`
                    : t('vsReadyToGenerate')}
                </p>
              </div>
              <div className="flex gap-2">
                {selectedScript && (
                  <button
                    onClick={() => handleDelete(selectedScript.id)}
                    className="px-3 py-1.5 text-xs bg-aR/10 text-aR border border-aR/30 rounded hover:bg-aR/20 transition-colors"
                  >
                    {t('vsDelete')}
                  </button>
                )}
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="px-4 py-1.5 text-xs bg-aB text-white rounded hover:bg-aB/80 transition-colors disabled:opacity-50"
                >
                  {generating ? t('vsGenerating') : selectedScript ? t('vsRegenerate') : t('vsGenerate')}
                </button>
              </div>
            </div>

            {/* Settings: Avatar, Orientation, Theme */}
            {selectedScript && (
              <div className="bg-bg1 border border-bd rounded-lg p-4 mb-4 space-y-4">
                <div className="text-xs font-semibold text-t1 mb-2">{t('vsSettings')}</div>

                {/* Orientation Toggle */}
                <div>
                  <span className="text-[10px] text-tM uppercase tracking-wider">{t('vsOrientation')}</span>
                  <div className="flex gap-2 mt-1">
                    {(['horizontal', 'vertical'] as const).map((o) => (
                      <button
                        key={o}
                        onClick={() => handleUpdateSettings({ orientation: o })}
                        className={`px-3 py-1.5 text-xs rounded border transition-colors flex items-center gap-2 ${
                          selectedScript.orientation === o
                            ? 'border-aB bg-aB/10 text-aB'
                            : 'border-bd bg-bg0 text-t2 hover:border-aB/50'
                        }`}
                      >
                        <span className={`inline-block border border-current rounded-sm ${o === 'horizontal' ? 'w-5 h-3' : 'w-3 h-5'}`} />
                        {o === 'horizontal' ? '16:9' : '9:16'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Avatar Picker */}
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-tM uppercase tracking-wider">{t('vsAvatar')}</span>
                    {!avatarsLoaded && (
                      <button onClick={loadAvatars} className="text-[10px] text-aB hover:underline">{t('vsLoadAvatars')}</button>
                    )}
                  </div>
                  {avatarsLoaded && avatars.length > 0 && (
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {avatars.map((av) => (
                        <button
                          key={av.id}
                          onClick={() => handleUpdateSettings({ avatarId: av.id })}
                          className={`w-14 h-14 rounded-lg border-2 overflow-hidden transition-all ${
                            selectedScript.avatarId === av.id ? 'border-aB ring-1 ring-aB' : 'border-bd hover:border-aB/50'
                          }`}
                          title={av.name}
                        >
                          {av.imageUrl ? (
                            <img src={av.imageUrl} alt={av.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-bg2 flex items-center justify-center text-[10px] text-tM">{av.name.charAt(0)}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {avatarsLoaded && avatars.length === 0 && (
                    <p className="text-[10px] text-tM mt-1">{t('vsNoAvatars')}</p>
                  )}
                </div>

                {/* Theme Selector */}
                <div>
                  <span className="text-[10px] text-tM uppercase tracking-wider">{t('vsTheme')}</span>
                  <div className="grid grid-cols-5 gap-2 mt-1">
                    {THEMES.map((th) => (
                      <button
                        key={th.id}
                        onClick={() => handleUpdateSettings({ theme: th.id })}
                        className={`rounded-lg border-2 p-2 transition-all text-left ${
                          selectedScript.theme === th.id ? 'border-aB ring-1 ring-aB' : 'border-bd hover:border-aB/50'
                        }`}
                        title={th.desc}
                      >
                        <div className="flex gap-1 mb-1">
                          <span className="w-4 h-4 rounded-sm" style={{ backgroundColor: th.colors[0] }} />
                          <span className="w-4 h-4 rounded-sm" style={{ backgroundColor: th.colors[1] }} />
                        </div>
                        <span className="text-[9px] text-t2 leading-tight block truncate">{th.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Video Pipeline */}
            {selectedScript && (
              <div className="space-y-3 mb-4">
                {/* Step 1: TTS Audio */}
                <div className="bg-bg1 border border-bd rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-aP/20 text-aP flex items-center justify-center text-[10px] font-bold">1</span>
                      <div>
                        <span className="text-xs font-semibold text-t1">{t('ttsAudioTitle')}</span>
                        <div className="mt-0.5">
                          {(() => {
                            const st = AUDIO_STATUS_CONFIG[selectedScript.audioStatus] || AUDIO_STATUS_CONFIG.pending;
                            return <span className="text-[10px]" style={{ color: st.color }}>{st.label}</span>;
                          })()}
                        </div>
                      </div>
                    </div>
                    <button onClick={handleGenerateTts} disabled={generatingTts} className="px-4 py-1.5 text-xs bg-aP text-white rounded hover:bg-aP/80 transition-colors disabled:opacity-50">
                      {generatingTts ? t('ttsGenerating') : selectedScript.audioUrl ? t('ttsRegenerate') : t('ttsGenerate')}
                    </button>
                  </div>
                  {selectedScript.audioUrl && selectedScript.audioStatus === 'done' && (
                    <div className="mt-3">
                      <audio controls className="w-full h-8" src={`${apiBaseUrl}${selectedScript.audioUrl}`} />
                    </div>
                  )}
                </div>

                {/* Step 2: HeyGen Avatar Video */}
                <div className="bg-bg1 border border-bd rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-aG/20 text-aG flex items-center justify-center text-[10px] font-bold">2</span>
                      <div>
                        <span className="text-xs font-semibold text-t1">{t('heygenTitle')}</span>
                        <div className="mt-0.5">
                          {(() => {
                            const st = AUDIO_STATUS_CONFIG[selectedScript.heygenStatus] || AUDIO_STATUS_CONFIG.pending;
                            return <span className="text-[10px]" style={{ color: st.color }}>{st.label}</span>;
                          })()}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {selectedScript.heygenStatus === 'processing' && (
                        <button onClick={handleCheckHeygen} className="px-3 py-1.5 text-xs bg-bg2 text-t2 rounded hover:bg-bg2/80 transition-colors">
                          {t('heygenCheckStatus')}
                        </button>
                      )}
                      <button onClick={handleGenerateHeygen} disabled={generatingHeygen || selectedScript.audioStatus !== 'done'} className="px-4 py-1.5 text-xs bg-aG text-white rounded hover:bg-aG/80 transition-colors disabled:opacity-50">
                        {generatingHeygen ? t('heygenGenerating') : selectedScript.heygenVideoUrl ? t('heygenRegenerate') : t('heygenGenerate')}
                      </button>
                    </div>
                  </div>
                  {selectedScript.heygenVideoUrl && selectedScript.heygenStatus === 'done' && (
                    <div className="mt-3">
                      <video controls className="w-full rounded" src={selectedScript.heygenVideoUrl} />
                    </div>
                  )}
                  {selectedScript.audioStatus !== 'done' && (
                    <p className="text-[10px] text-tM mt-2">{t('heygenNeedsTts')}</p>
                  )}
                </div>

                {/* Step 3: Remotion Subtitle Rendering */}
                <div className="bg-bg1 border border-bd rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-aO/20 text-aO flex items-center justify-center text-[10px] font-bold">3</span>
                      <div>
                        <span className="text-xs font-semibold text-t1">{t('remotionTitle')}</span>
                        <div className="mt-0.5">
                          {(() => {
                            const st = AUDIO_STATUS_CONFIG[selectedScript.remotionStatus] || AUDIO_STATUS_CONFIG.pending;
                            return <span className="text-[10px]" style={{ color: st.color }}>{st.label}</span>;
                          })()}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {(selectedScript.remotionStatus === 'rendering' || selectedScript.remotionStatus === 'preparing') && (
                        <button onClick={handleCheckRemotion} className="px-3 py-1.5 text-xs bg-bg2 text-t2 rounded hover:bg-bg2/80 transition-colors">
                          {t('remotionCheckStatus')}
                        </button>
                      )}
                      <button onClick={handleGenerateRemotion} disabled={generatingRemotion || selectedScript.heygenStatus !== 'done'} className="px-4 py-1.5 text-xs bg-aO text-white rounded hover:bg-aO/80 transition-colors disabled:opacity-50">
                        {generatingRemotion ? t('remotionGenerating') : selectedScript.remotionVideoUrl ? t('remotionRegenerate') : t('remotionGenerate')}
                      </button>
                    </div>
                  </div>
                  {selectedScript.remotionVideoUrl && selectedScript.remotionStatus === 'done' && (
                    <div className="mt-3 flex items-center gap-3">
                      <a href={selectedScript.remotionVideoUrl} target="_blank" rel="noreferrer" className="px-4 py-2 text-xs bg-aG text-white rounded hover:bg-aG/80 transition-colors inline-flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                        {t('remotionDownload')}
                      </a>
                    </div>
                  )}
                  {selectedScript.heygenStatus !== 'done' && (
                    <p className="text-[10px] text-tM mt-2">{t('remotionNeedsHeygen')}</p>
                  )}
                </div>
              </div>
            )}

            {/* Script sections */}
            {selectedScript && (
              <div className="space-y-3">
                {selectedScript.sections.map((sec, i) => (
                  <div key={sec.id} className="bg-bg1 border border-bd rounded-lg overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-bd bg-bg2/50">
                      <span className="w-6 h-6 rounded-full bg-bg2 flex items-center justify-center text-[10px] font-mono text-tM">{i}</span>
                      <span className="text-xs font-semibold text-t1 flex-1">{sec.section}</span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                        style={{ color: SECTION_TYPE_COLORS[sec.type] || '#8b949e', backgroundColor: (SECTION_TYPE_COLORS[sec.type] || '#8b949e') + '20' }}
                      >
                        {sec.type}
                      </span>
                      {(() => {
                        const vt = VISUAL_TYPE_CONFIG[sec.visualType] || VISUAL_TYPE_CONFIG.avatar;
                        return (
                          <span className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1" style={{ color: vt.color, backgroundColor: vt.color + '20' }}>
                            <span>{vt.icon}</span>{vt.label}
                          </span>
                        );
                      })()}
                      <button
                        onClick={() => {
                          if (editingSection === sec.id) { setEditingSection(null); }
                          else {
                            setEditingSection(sec.id);
                            setEditValues({
                              [`heading-${sec.id}`]: sec.heading,
                              [`narration-${sec.id}`]: sec.narration,
                              [`points-${sec.id}`]: sec.points,
                              [`visualType-${sec.id}`]: sec.visualType || 'avatar',
                              [`visualNote-${sec.id}`]: sec.visualNote || '',
                            });
                          }
                        }}
                        className="text-tM hover:text-t1 transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                      </button>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      {editingSection === sec.id ? (
                        <>
                          <div>
                            <label className="text-[10px] text-tM uppercase tracking-wider">{t('vsHeading')}</label>
                            <input value={editValues[`heading-${sec.id}`] || ''} onChange={(e) => setEditValues((v) => ({ ...v, [`heading-${sec.id}`]: e.target.value }))} className="w-full mt-1 px-2 py-1.5 text-xs bg-bg0 border border-bd rounded text-t1 focus:border-aB outline-none" />
                          </div>
                          <div>
                            <label className="text-[10px] text-tM uppercase tracking-wider">{t('vsNarration')}</label>
                            <textarea value={editValues[`narration-${sec.id}`] || ''} onChange={(e) => setEditValues((v) => ({ ...v, [`narration-${sec.id}`]: e.target.value }))} rows={3} className="w-full mt-1 px-2 py-1.5 text-xs bg-bg0 border border-bd rounded text-t1 focus:border-aB outline-none resize-none" />
                          </div>
                          <div>
                            <label className="text-[10px] text-tM uppercase tracking-wider">{t('vsPoints')}</label>
                            <input value={editValues[`points-${sec.id}`] || ''} onChange={(e) => setEditValues((v) => ({ ...v, [`points-${sec.id}`]: e.target.value }))} className="w-full mt-1 px-2 py-1.5 text-xs bg-bg0 border border-bd rounded text-t1 focus:border-aB outline-none" />
                          </div>
                          <div className="flex gap-3">
                            <div className="flex-1">
                              <label className="text-[10px] text-tM uppercase tracking-wider">{t('vsVisualType')}</label>
                              <select value={editValues[`visualType-${sec.id}`] || 'avatar'} onChange={(e) => setEditValues((v) => ({ ...v, [`visualType-${sec.id}`]: e.target.value }))} className="w-full mt-1 px-2 py-1.5 text-xs bg-bg0 border border-bd rounded text-t1 focus:border-aB outline-none">
                                {Object.entries(VISUAL_TYPE_CONFIG).map(([key, cfg]) => (
                                  <option key={key} value={key}>{cfg.icon} {cfg.label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex-1">
                              <label className="text-[10px] text-tM uppercase tracking-wider">{t('vsVisualNote')}</label>
                              <input value={editValues[`visualNote-${sec.id}`] || ''} onChange={(e) => setEditValues((v) => ({ ...v, [`visualNote-${sec.id}`]: e.target.value }))} className="w-full mt-1 px-2 py-1.5 text-xs bg-bg0 border border-bd rounded text-t1 focus:border-aB outline-none" />
                            </div>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button onClick={() => handleSaveSection(sec.id)} className="px-3 py-1 text-[10px] bg-aG text-white rounded hover:bg-aG/80">{t('vsSave')}</button>
                            <button onClick={() => setEditingSection(null)} className="px-3 py-1 text-[10px] bg-bg2 text-t2 rounded hover:bg-bg2/80">{t('vsCancel')}</button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <span className="text-[10px] text-tM uppercase tracking-wider">{t('vsHeading')}</span>
                            <p className="text-sm text-t1 mt-0.5">{sec.heading}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-tM uppercase tracking-wider">{t('vsNarration')}</span>
                            <p className="text-xs text-t2 mt-0.5 leading-relaxed">{sec.narration}</p>
                          </div>
                          <div className="flex gap-4">
                            <div className="flex-1">
                              <span className="text-[10px] text-tM uppercase tracking-wider">{t('vsPoints')}</span>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {sec.points.split(/[、,]/).map((p, pi) => (
                                  <span key={pi} className="text-[10px] px-2 py-0.5 bg-bg2 text-t2 rounded">{p.trim()}</span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <span className="text-[10px] text-tM uppercase tracking-wider">{t('vsBgKeyword')}</span>
                              <p className="text-[10px] text-aB mt-0.5 font-mono">{sec.backgroundKeyword}</p>
                            </div>
                          </div>
                          {sec.visualNote && (
                            <div>
                              <span className="text-[10px] text-tM uppercase tracking-wider">{t('vsVisualNote')}</span>
                              <p className="text-[10px] text-t2 mt-0.5 italic">{sec.visualNote}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!selectedScript && !generating && (
              <div className="flex items-center justify-center h-64 border border-dashed border-bd rounded-lg">
                <div className="text-center">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-2 text-tM">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  <p className="text-xs text-tM">{t('vsClickGenerate')}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dictionary Modal */}
      {dictOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDictOpen(false)}>
          <div className="bg-bg1 border border-bd rounded-lg w-[480px] max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-bd">
              <h2 className="text-sm font-semibold text-t1">{t('ttsDictTitle')}</h2>
              <button onClick={() => setDictOpen(false)} className="text-tM hover:text-t1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <p className="text-[10px] text-tM mb-3">{t('ttsDictDesc')}</p>

              {/* Add new entry */}
              <div className="flex gap-2 mb-4">
                <input
                  value={newKanji}
                  onChange={(e) => setNewKanji(e.target.value)}
                  placeholder={t('ttsDictKanji')}
                  className="flex-1 px-2 py-1.5 text-xs bg-bg0 border border-bd rounded text-t1 focus:border-aB outline-none"
                />
                <span className="text-tM text-xs self-center">→</span>
                <input
                  value={newReading}
                  onChange={(e) => setNewReading(e.target.value)}
                  placeholder={t('ttsDictReading')}
                  className="flex-1 px-2 py-1.5 text-xs bg-bg0 border border-bd rounded text-t1 focus:border-aB outline-none"
                />
                <button
                  onClick={handleAddDictEntry}
                  className="px-3 py-1.5 text-[10px] bg-aG text-white rounded hover:bg-aG/80"
                >
                  {t('ttsDictAdd')}
                </button>
              </div>

              {/* Entries list */}
              {dictEntries.length === 0 ? (
                <p className="text-xs text-tM text-center py-4">{t('ttsDictEmpty')}</p>
              ) : (
                <div className="space-y-1">
                  {dictEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-2 px-3 py-1.5 bg-bg0 rounded text-xs">
                      <span className="text-t1 font-medium flex-1">{entry.kanji}</span>
                      <span className="text-tM">→</span>
                      <span className="text-aC flex-1">{entry.reading}</span>
                      <button
                        onClick={() => handleDeleteDictEntry(entry.id)}
                        className="text-tM hover:text-aR transition-colors"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
