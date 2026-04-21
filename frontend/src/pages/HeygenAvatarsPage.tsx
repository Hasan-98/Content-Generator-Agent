import { useEffect, useRef, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';
import {
  listHeygenAvatars,
  getHeygenAvatar,
  refreshHeygenAvatar,
  retryHeygenAvatar,
  deleteHeygenAvatar,
} from '../api/heygenAvatars';
import { getApiConfig } from '../api/apiConfig';
import type { HeygenTrainedAvatar } from '../types';
import AvatarCard from '../components/heygen/AvatarCard';
import CreateAvatarModal from '../components/heygen/CreateAvatarModal';
import SettingsModal from '../components/user/SettingsModal';

const POLL_INTERVAL_MS = 10_000; // Poll active avatars every 10s

export default function HeygenAvatarsPage() {
  const { t } = useLanguage();
  const [avatars, setAvatars] = useState<HeygenTrainedAvatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiKeyMissingPrompt, setApiKeyMissingPrompt] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const rows = await listHeygenAvatars();
      setAvatars(rows);
    } catch {
      toast.error(t('heygenAvatarLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  // Poll in-progress avatars so status badges update live
  useEffect(() => {
    const active = avatars.filter(a =>
      a.status === 'PENDING' || a.status === 'UPLOADING' || a.status === 'TRAINING'
    );
    if (active.length === 0) {
      if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
      return;
    }
    if (pollTimerRef.current) return;
    pollTimerRef.current = setInterval(async () => {
      const current = avatars.filter(a =>
        a.status === 'PENDING' || a.status === 'UPLOADING' || a.status === 'TRAINING'
      );
      if (current.length === 0) return;
      try {
        const updated = await Promise.all(current.map(a => getHeygenAvatar(a.id).catch(() => null)));
        setAvatars(prev => prev.map(a => {
          const u = updated.find(x => x && x.id === a.id);
          return u ?? a;
        }));
      } catch { /* ignore transient poll errors */ }
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
    };
  }, [avatars]);

  async function handleDelete(id: string) {
    if (!confirm(t('heygenAvatarDeleteConfirm'))) return;
    try {
      await deleteHeygenAvatar(id);
      setAvatars(prev => prev.filter(a => a.id !== id));
      toast.success(t('heygenAvatarDeletedToast'));
    } catch {
      toast.error(t('heygenAvatarDeleteFailed'));
    }
  }

  async function handleRefresh(id: string) {
    try {
      const updated = await refreshHeygenAvatar(id);
      setAvatars(prev => prev.map(a => a.id === id ? updated : a));
      if (updated.status === 'READY') toast.success(t('heygenAvatarReadyToast'));
    } catch {
      toast.error(t('heygenAvatarRefreshFailed'));
    }
  }

  async function handleRetry(id: string) {
    try {
      const updated = await retryHeygenAvatar(id);
      setAvatars(prev => prev.map(a => a.id === id ? updated : a));
      toast.success(t('heygenAvatarRetryStarted'));
    } catch {
      toast.error(t('heygenAvatarRetryFailed'));
    }
  }

  async function handleCreateClick() {
    try {
      const config = await getApiConfig();
      if (!config.heygenApi) {
        setApiKeyMissingPrompt(true);
        return;
      }
    } catch {
      // If we can't check, let user proceed anyway
    }
    setCreateOpen(true);
  }

  function handleCreated(row: HeygenTrainedAvatar) {
    setAvatars(prev => [row, ...prev]);
  }

  return (
    <div className="flex flex-1 overflow-hidden flex-col bg-bg0">
      {/* Top bar */}
      <div className="h-12 border-b border-bd flex items-center justify-between px-5 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-t1 font-semibold">{t('heygenAvatarPageTitle')}</span>
          <span className="text-xs text-tM">({avatars.length})</span>
        </div>
        <button
          onClick={handleCreateClick}
          className="text-xs px-3 py-1.5 rounded bg-aB/20 text-aB border border-aB/40 hover:bg-aB/30 transition-colors font-medium"
        >
          + {t('heygenAvatarCreateBtn')}
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="flex items-center justify-center h-full text-tM text-sm">{t('appLoading')}</div>
        ) : avatars.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-5xl mb-3">👤</div>
            <div className="text-sm text-t2 mb-1">{t('heygenAvatarEmptyTitle')}</div>
            <div className="text-xs text-tM">{t('heygenAvatarEmptyHint')}</div>
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            {avatars.map(a => (
              <AvatarCard key={a.id} avatar={a} onDelete={handleDelete} onRefresh={handleRefresh} onRetry={handleRetry} />
            ))}
          </div>
        )}
      </div>

      {createOpen && <CreateAvatarModal onClose={() => setCreateOpen(false)} onCreated={handleCreated} />}

      {/* API key missing prompt */}
      {apiKeyMissingPrompt && (
        <div className="fixed inset-0 bg-bg0/80 z-50 flex items-center justify-center p-4" onClick={() => setApiKeyMissingPrompt(false)}>
          <div className="bg-bg1 border border-bd rounded-lg w-full max-w-sm shadow-xl p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-aO">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span className="text-sm font-semibold text-t1">{t('heygenAvatarApiMissingTitle')}</span>
            </div>
            <p className="text-xs text-t2 mb-4">{t('heygenAvatarApiMissingDesc')}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setApiKeyMissingPrompt(false)}
                className="text-xs px-3 py-1.5 rounded border border-bd text-t2 hover:text-t1 transition-colors"
              >
                {t('heygenAvatarCancel')}
              </button>
              <button
                onClick={() => { setApiKeyMissingPrompt(false); setSettingsOpen(true); }}
                className="text-xs px-3 py-1.5 rounded bg-aB/20 text-aB border border-aB/40 hover:bg-aB/30 transition-colors font-medium"
              >
                {t('heygenAvatarOpenSettings')}
              </button>
            </div>
          </div>
        </div>
      )}

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} initialSection="heygenApi" />}
    </div>
  );
}
