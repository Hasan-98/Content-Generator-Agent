import { useEffect, useRef, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';
import {
  listHeygenAvatars,
  getHeygenAvatar,
  refreshHeygenAvatar,
  deleteHeygenAvatar,
} from '../api/heygenAvatars';
import type { HeygenTrainedAvatar } from '../types';
import AvatarCard from '../components/heygen/AvatarCard';
import CreateAvatarModal from '../components/heygen/CreateAvatarModal';

const POLL_INTERVAL_MS = 10_000; // Poll active avatars every 10s

export default function HeygenAvatarsPage() {
  const { t } = useLanguage();
  const [avatars, setAvatars] = useState<HeygenTrainedAvatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
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
          onClick={() => setCreateOpen(true)}
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
              <AvatarCard key={a.id} avatar={a} onDelete={handleDelete} onRefresh={handleRefresh} />
            ))}
          </div>
        )}
      </div>

      {createOpen && <CreateAvatarModal onClose={() => setCreateOpen(false)} onCreated={handleCreated} />}
    </div>
  );
}
