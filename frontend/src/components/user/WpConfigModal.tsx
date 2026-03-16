import { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { getWpConfig, upsertWpConfig, deleteWpConfig, testWpConnection } from '../../api/wpConfig';
import type { WpConfigResponse } from '../../api/wpConfig';
import toast from 'react-hot-toast';

interface Props {
  onClose: () => void;
}

export default function WpConfigModal({ onClose }: Props) {
  const { t } = useLanguage();
  const [wpUrl, setWpUrl] = useState('');
  const [wpUser, setWpUser] = useState('');
  const [wpPassword, setWpPassword] = useState('');
  const [existing, setExisting] = useState<WpConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const config = await getWpConfig();
        if (config) {
          setExisting(config);
          setWpUrl(config.wpUrl);
          setWpUser(config.wpUser);
        }
      } catch {
        // No config yet — that's fine
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSave() {
    if (!wpUrl.trim() || !wpUser.trim()) {
      toast.error(t('wpConfigErrRequired'));
      return;
    }
    if (!existing && !wpPassword.trim()) {
      toast.error(t('wpConfigErrPasswordRequired'));
      return;
    }

    setSaving(true);
    try {
      const payload: { wpUrl: string; wpUser: string; wpPassword?: string } = {
        wpUrl: wpUrl.trim(),
        wpUser: wpUser.trim(),
      };
      if (wpPassword.trim()) payload.wpPassword = wpPassword.trim();

      const result = await upsertWpConfig(payload);
      setExisting(result);
      setWpPassword('');
      toast.success(t('wpConfigSaved'));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || t('wpConfigErrSaveFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    try {
      const result = await testWpConnection();
      if (result.success) {
        toast.success(`${t('wpConfigTestOk')} — ${result.siteName}`);
      } else {
        toast.error(result.error || t('wpConfigTestFail'));
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || t('wpConfigTestFail'));
    } finally {
      setTesting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteWpConfig();
      setExisting(null);
      setWpUrl('');
      setWpUser('');
      setWpPassword('');
      toast.success(t('wpConfigDeleted'));
    } catch {
      toast.error(t('wpConfigErrDeleteFailed'));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-bg0/70 backdrop-blur-sm" />
      <div
        className="relative w-[480px] bg-bg1 border border-bd rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-bd">
          <div className="flex items-center gap-2.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5 text-aB">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
              <path d="M3.5 12l3.2 8.5L9 13l4-1-4-1L6.7 3.5 3.5 12z" />
              <path d="M12 8.5l1.5 4 4 1.5-4 1.5L12 19.5l-1.5-4L6.5 14l4-1.5L12 8.5z" />
            </svg>
            <div>
              <div className="text-sm font-semibold text-t1">{t('wpConfigTitle')}</div>
              <div className="text-[11px] text-tM mt-0.5">{t('wpConfigSubtitle')}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-t2 hover:text-t1 text-lg transition-colors">✕</button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-t2 text-sm">{t('wpConfigLoading')}</div>
        ) : (
          <>
            <div className="p-5 space-y-4">
              {/* Status indicator */}
              {existing && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-aG/10 border border-aG/20">
                  <div className="w-2 h-2 rounded-full bg-aG" />
                  <span className="text-xs text-aG font-medium">{t('wpConfigConnected')}</span>
                  <span className="text-xs text-t2 ml-auto">{existing.wpUrl}</span>
                </div>
              )}

              {/* Site URL */}
              <div>
                <label className="text-xs text-t2 mb-1 block">{t('wpConfigUrl')}</label>
                <input
                  value={wpUrl}
                  onChange={(e) => setWpUrl(e.target.value)}
                  placeholder="https://your-site.com"
                  className="w-full bg-bg0 border border-bd rounded px-3 py-2 text-sm text-t1 focus:outline-none focus:border-aB transition-colors placeholder:text-tM"
                />
                <div className="text-[10px] text-tM mt-1">{t('wpConfigUrlHint')}</div>
              </div>

              {/* Username */}
              <div>
                <label className="text-xs text-t2 mb-1 block">{t('wpConfigUser')}</label>
                <input
                  value={wpUser}
                  onChange={(e) => setWpUser(e.target.value)}
                  placeholder="admin@your-site.com"
                  className="w-full bg-bg0 border border-bd rounded px-3 py-2 text-sm text-t1 focus:outline-none focus:border-aB transition-colors placeholder:text-tM"
                />
              </div>

              {/* Application Password */}
              <div>
                <label className="text-xs text-t2 mb-1 block">
                  {t('wpConfigPassword')}
                  {existing && <span className="text-tM ml-1">({t('wpConfigPasswordHint')})</span>}
                </label>
                <input
                  type="password"
                  value={wpPassword}
                  onChange={(e) => setWpPassword(e.target.value)}
                  placeholder={existing ? t('wpConfigPasswordPlaceholderExisting') : t('wpConfigPasswordPlaceholder')}
                  className="w-full bg-bg0 border border-bd rounded px-3 py-2 text-sm text-t1 focus:outline-none focus:border-aO transition-colors placeholder:text-tM"
                />
                <div className="text-[10px] text-tM mt-1">{t('wpConfigPasswordGuide')}</div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-bd bg-bg0/30">
              <div className="flex gap-2">
                {existing && (
                  <>
                    <button
                      onClick={handleTest}
                      disabled={testing}
                      className="px-3 py-2 text-xs rounded border border-aG/40 text-aG hover:bg-aG/10 disabled:opacity-50 transition-colors"
                    >
                      {testing ? t('wpConfigTesting') : t('wpConfigTestBtn')}
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="px-3 py-2 text-xs rounded border border-aR/40 text-aR hover:bg-aR/10 disabled:opacity-50 transition-colors"
                    >
                      {deleting ? t('wpConfigDeleting') : t('wpConfigDeleteBtn')}
                    </button>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-xs text-t2 hover:text-t1 rounded border border-bd hover:border-t2 transition-colors"
                >
                  {t('wpConfigCancel')}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 text-xs rounded bg-aB/20 text-aB border border-aB/40 hover:bg-aB/30 disabled:opacity-50 transition-colors font-medium"
                >
                  {saving ? t('wpConfigSaving') : t('wpConfigSaveBtn')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
