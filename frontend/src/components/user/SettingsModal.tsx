import { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { getApiConfig, upsertApiConfig, deleteApiKey, changePassword } from '../../api/apiConfig';
import type { ApiConfigStatus, ApiKeyName } from '../../api/apiConfig';
import toast from 'react-hot-toast';

interface Props {
  onClose: () => void;
  initialSection?: 'password' | ApiKeyName;
}

const API_KEY_SECTIONS: { key: ApiKeyName; label: string; labelJa: string; placeholder: string }[] = [
  { key: 'claudeApi', label: 'Claude API', labelJa: 'Claude API', placeholder: 'sk-ant-...' },
  { key: 'openaiApi', label: 'OpenAI API', labelJa: 'OpenAI API', placeholder: 'sk-...' },
  { key: 'geminiApi', label: 'Gemini API', labelJa: 'Gemini API', placeholder: 'AIza...' },
  { key: 'googleApi', label: 'Google API', labelJa: 'Google API', placeholder: 'AIza...' },
  { key: 'metaApi', label: 'Meta API', labelJa: 'Meta API', placeholder: 'Enter API key...' },
  { key: 'kieApi', label: 'Kie API', labelJa: 'Kie API', placeholder: 'Enter API key...' },
  { key: 'pieapi', label: 'Pieapi', labelJa: 'Pieapi', placeholder: 'Enter API key...' },
  { key: 'heygenApi', label: 'HeyGen API', labelJa: 'HeyGen API', placeholder: 'sk_V2_hgu_...' },
];

export default function SettingsModal({ onClose, initialSection }: Props) {
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState<'password' | ApiKeyName>(initialSection || 'password');
  const [config, setConfig] = useState<ApiConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // API key state
  const [keyValue, setKeyValue] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [deletingKey, setDeletingKey] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await getApiConfig();
        setConfig(data);
      } catch {
        // No config yet
        setConfig({
          claudeApi: false, openaiApi: false, geminiApi: false,
          googleApi: false, metaApi: false, kieApi: false, pieapi: false,
          heygenApi: false,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Reset key input when switching sections
  useEffect(() => {
    setKeyValue('');
  }, [activeSection]);

  async function handlePasswordSave() {
    if (!currentPassword.trim() || !newPassword.trim()) {
      toast.error(t('settingsPasswordRequired'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('settingsPasswordMismatch'));
      return;
    }
    if (newPassword.length < 6) {
      toast.error(t('settingsPasswordTooShort'));
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword });
      toast.success(t('settingsPasswordChanged'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || t('settingsPasswordFailed'));
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleKeySave(key: ApiKeyName) {
    if (!keyValue.trim()) {
      toast.error(t('settingsKeyRequired'));
      return;
    }

    setSavingKey(true);
    try {
      const updated = await upsertApiConfig({ [key]: keyValue.trim() });
      setConfig(updated);
      setKeyValue('');
      toast.success(t('settingsKeySaved'));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || t('settingsKeySaveFailed'));
    } finally {
      setSavingKey(false);
    }
  }

  async function handleKeyDelete(key: ApiKeyName) {
    setDeletingKey(true);
    try {
      await deleteApiKey(key);
      setConfig(prev => prev ? { ...prev, [key]: false } : prev);
      toast.success(t('settingsKeyDeleted'));
    } catch {
      toast.error(t('settingsKeyDeleteFailed'));
    } finally {
      setDeletingKey(false);
    }
  }

  const sections: { id: 'password' | ApiKeyName; label: string; icon: React.ReactNode; isSet?: boolean }[] = [
    {
      id: 'password',
      label: t('settingsPassword'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
    },
    ...API_KEY_SECTIONS.map(s => ({
      id: s.key,
      label: s.label,
      isSet: config?.[s.key] ?? false,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
          <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
        </svg>
      ),
    })),
  ];

  const currentApiSection = API_KEY_SECTIONS.find(s => s.key === activeSection);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-bg0/70 backdrop-blur-sm" />
      <div
        className="relative w-[600px] max-h-[80vh] bg-bg1 border border-bd rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-bd shrink-0">
          <div className="flex items-center gap-2.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5 text-aB">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <div>
              <div className="text-sm font-semibold text-t1">{t('settingsTitle')}</div>
              <div className="text-[11px] text-tM mt-0.5">{t('settingsSubtitle')}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-t2 hover:text-t1 text-lg transition-colors">✕</button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-t2 text-sm">{t('settingsLoading')}</div>
        ) : (
          <div className="flex flex-1 min-h-0">
            {/* Sidebar nav */}
            <div className="w-[180px] border-r border-bd py-2 overflow-y-auto shrink-0">
              {sections.map(s => (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-xs transition-colors ${
                    activeSection === s.id
                      ? 'bg-aB/10 text-aB border-r-2 border-aB'
                      : 'text-t2 hover:bg-bg2 hover:text-t1'
                  }`}
                >
                  {s.icon}
                  <span className="flex-1 text-left">{s.label}</span>
                  {s.isSet !== undefined && (
                    <div className={`w-2 h-2 rounded-full shrink-0 ${s.isSet ? 'bg-aG' : 'bg-tM/30'}`} />
                  )}
                </button>
              ))}
            </div>

            {/* Content area */}
            <div className="flex-1 p-5 overflow-y-auto">
              {activeSection === 'password' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-t2 mb-1 block">{t('settingsCurrentPassword')}</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      className="w-full bg-bg0 border border-bd rounded px-3 py-2 text-sm text-t1 focus:outline-none focus:border-aB transition-colors placeholder:text-tM"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-t2 mb-1 block">{t('settingsNewPassword')}</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full bg-bg0 border border-bd rounded px-3 py-2 text-sm text-t1 focus:outline-none focus:border-aB transition-colors placeholder:text-tM"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-t2 mb-1 block">{t('settingsConfirmPassword')}</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full bg-bg0 border border-bd rounded px-3 py-2 text-sm text-t1 focus:outline-none focus:border-aB transition-colors placeholder:text-tM"
                    />
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handlePasswordSave}
                      disabled={savingPassword}
                      className="px-4 py-2 text-xs rounded bg-aB/20 text-aB border border-aB/40 hover:bg-aB/30 disabled:opacity-50 transition-colors font-medium"
                    >
                      {savingPassword ? t('settingsSaving') : t('settingsChangePassword')}
                    </button>
                  </div>
                </div>
              )}

              {currentApiSection && (
                <div className="space-y-4">
                  {/* Status indicator */}
                  {config?.[currentApiSection.key] && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-aG/10 border border-aG/20">
                      <div className="w-2 h-2 rounded-full bg-aG" />
                      <span className="text-xs text-aG font-medium">{t('settingsKeyConfigured')}</span>
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-t2 mb-1 block">
                      {currentApiSection.label} Key
                      {config?.[currentApiSection.key] && (
                        <span className="text-tM ml-1">({t('settingsKeyUpdateHint')})</span>
                      )}
                    </label>
                    <input
                      type="password"
                      value={keyValue}
                      onChange={e => setKeyValue(e.target.value)}
                      placeholder={currentApiSection.placeholder}
                      className="w-full bg-bg0 border border-bd rounded px-3 py-2 text-sm text-t1 focus:outline-none focus:border-aO transition-colors placeholder:text-tM font-mono"
                    />
                    <div className="text-[10px] text-tM mt-1">{t('settingsKeyEncryptedHint')}</div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div>
                      {config?.[currentApiSection.key] && (
                        <button
                          onClick={() => handleKeyDelete(currentApiSection.key)}
                          disabled={deletingKey}
                          className="px-3 py-2 text-xs rounded border border-aR/40 text-aR hover:bg-aR/10 disabled:opacity-50 transition-colors"
                        >
                          {deletingKey ? t('settingsDeleting') : t('settingsRemoveKey')}
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => handleKeySave(currentApiSection.key)}
                      disabled={savingKey}
                      className="px-4 py-2 text-xs rounded bg-aB/20 text-aB border border-aB/40 hover:bg-aB/30 disabled:opacity-50 transition-colors font-medium"
                    >
                      {savingKey ? t('settingsSaving') : t('settingsSaveKey')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
