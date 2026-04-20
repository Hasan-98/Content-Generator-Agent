import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { updateMe } from '../../api/auth';
import toast from 'react-hot-toast';

interface Props {
  onClose: () => void;
}

export default function UserSettingsModal({ onClose }: Props) {
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (newPassword && newPassword !== confirmPassword) {
      toast.error(t('settingsPasswordMismatch'));
      return;
    }
    if (newPassword && newPassword.length < 6) {
      toast.error(t('settingsPasswordTooShort'));
      return;
    }

    setSaving(true);
    try {
      const payload: Parameters<typeof updateMe>[0] = {};
      if (name !== user?.name) payload.name = name;
      if (email !== user?.email) payload.email = email;
      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      if (Object.keys(payload).length === 0) {
        toast(t('acctNoChanges'));
        return;
      }

      const updated = await updateMe(payload);
      updateUser(updated);
      toast.success(t('acctSaved'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || t('acctSaveFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-bg0/70 backdrop-blur-sm" />
      <div
        className="relative w-[440px] bg-bg1 border border-bd rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-bd">
          <div>
            <div className="text-sm font-semibold text-t1">{t('acctSettingsTitle')}</div>
            <div className="text-[11px] text-tM mt-0.5">{user?.email} · {user?.role}</div>
          </div>
          <button onClick={onClose} className="text-t2 hover:text-t1 text-lg transition-colors">✕</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Profile section */}
          <div>
            <div className="text-[11px] font-semibold text-aB uppercase tracking-wider mb-3">{t('acctProfileSection')}</div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-t2 mb-1 block">{t('acctNameLabel')}</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-bg0 border border-bd rounded px-3 py-2 text-sm text-t1 focus:outline-none focus:border-aB transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-t2 mb-1 block">{t('acctEmailLabel')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-bg0 border border-bd rounded px-3 py-2 text-sm text-t1 focus:outline-none focus:border-aB transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Password section */}
          <div>
            <div className="text-[11px] font-semibold text-aO uppercase tracking-wider mb-3">{t('acctPasswordSection')}</div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-t2 mb-1 block">{t('settingsCurrentPassword')}</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={t('acctCurrentPasswordPlaceholder')}
                  className="w-full bg-bg0 border border-bd rounded px-3 py-2 text-sm text-t1 focus:outline-none focus:border-aO transition-colors placeholder:text-tM"
                />
              </div>
              <div>
                <label className="text-xs text-t2 mb-1 block">{t('settingsNewPassword')}</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('acctNewPasswordPlaceholder')}
                  className="w-full bg-bg0 border border-bd rounded px-3 py-2 text-sm text-t1 focus:outline-none focus:border-aO transition-colors placeholder:text-tM"
                />
              </div>
              <div>
                <label className="text-xs text-t2 mb-1 block">{t('acctConfirmPasswordLabel')}</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('acctConfirmPlaceholder')}
                  className="w-full bg-bg0 border border-bd rounded px-3 py-2 text-sm text-t1 focus:outline-none focus:border-aO transition-colors placeholder:text-tM"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-bd bg-bg0/30">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-t2 hover:text-t1 rounded border border-bd hover:border-t2 transition-colors"
          >
            {t('detailCancelBtnLabel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-xs rounded bg-aB/20 text-aB border border-aB/40 hover:bg-aB/30 disabled:opacity-50 transition-colors font-medium"
          >
            {saving ? t('settingsSaving') : t('detailSaveBtnLabel')}
          </button>
        </div>
      </div>
    </div>
  );
}
