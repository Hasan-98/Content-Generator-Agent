import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { User, Role } from '../../types';
import { getUsers, createUser, updateUser, deleteUser } from '../../api/users';
import { impersonateUser, viewAsUser, editAsUser } from '../../api/auth';
import { sendInvite } from '../../api/invites';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

interface Props {
  onClose: () => void;
  defaultShowInvite?: boolean;
}

const AVATAR_COLORS = ['#58a6ff', '#3fb950', '#d29922', '#bc8cff', '#f778ba', '#39d2c0', '#f85149'];
const ROLES: Role[] = ['SUPERADMIN', 'ADMIN', 'EDITOR', 'VIEWER'];
const ROLE_COLORS: Record<Role, string> = {
  SUPERADMIN: 'bg-aR/15 text-aR',
  ADMIN: 'bg-aP/15 text-aP',
  EDITOR: 'bg-aB/15 text-aB',
  VIEWER: 'bg-t2/15 text-t2',
};

export default function UserModal({ onClose, defaultShowInvite = false }: Props) {
  const { user: currentUser, startImpersonation, startViewAs } = useAuth();
  const { lang, t } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'EDITOR' });
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'EDITOR' });
  const [inviting, setInviting] = useState(false);
  const [showInvitePanel, setShowInvitePanel] = useState(defaultShowInvite);

  const getRoleLabel = (role: Role) => {
    const map: Record<Role, ReturnType<typeof t>> = {
      SUPERADMIN: t('roleAdmin'),
      ADMIN: t('roleAdmin'),
      EDITOR: t('roleEditor'),
      VIEWER: t('roleViewer'),
    };
    return map[role];
  };

  useEffect(() => {
    getUsers()
      .then(setUsers)
      .catch(() => toast.error(t('toastUsersLoadFailed')))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    if (!form.name || !form.email || !form.password) {
      toast.error(t('toastUsersFillAll'));
      return;
    }
    try {
      const user = await createUser(form);
      setUsers((prev) => [...prev, user]);
      setForm({ name: '', email: '', password: '', role: 'EDITOR' });
      toast.success(lang === 'en' ? `${user.name} added` : `${user.name} を追加しました`);
    } catch {
      toast.error(t('toastUsersCreateFailed'));
    }
  }

  async function handleToggleActive(user: User) {
    try {
      const updated = await updateUser(user.id, { active: !user.active });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...updated } : u)));
      toast.success(
        lang === 'en'
          ? `${user.name} ${!user.active ? 'activated' : 'deactivated'}`
          : `${user.name} を${!user.active ? '有効化' : '無効化'}しました`
      );
    } catch {
      toast.error(t('toastUsersUpdateFailed'));
    }
  }

  async function handleCycleRole(user: User) {
    const nextRole = ROLES[(ROLES.indexOf(user.role as Role) + 1) % ROLES.length];
    const nextLabel = getRoleLabel(nextRole);
    try {
      const updated = await updateUser(user.id, { role: nextRole });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...updated } : u)));
      toast.success(
        lang === 'en'
          ? `${user.name}'s role changed to ${nextLabel}`
          : `${user.name} の権限を「${nextLabel}」に変更しました`
      );
    } catch {
      toast.error(t('toastUsersRoleChangeFailed'));
    }
  }

  async function handleDelete(user: User) {
    const confirmed = window.confirm(
      lang === 'en' ? `Delete ${user.name}?` : `${user.name} を削除しますか？`
    );
    if (!confirmed) return;
    try {
      await deleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      toast.success(lang === 'en' ? `${user.name} deleted` : `${user.name} を削除しました`);
    } catch {
      toast.error(t('toastUsersDeleteFailed'));
    }
  }

  async function handleImpersonate(user: User) {
    try {
      const { token, user: targetUser } = await impersonateUser(user.id);
      startImpersonation(token, targetUser);
      onClose();
      toast.success(lang === 'en' ? `Now accessing as ${user.name}` : `${user.name} としてアクセス中`);
    } catch {
      toast.error(lang === 'en' ? 'Failed to access account' : 'アカウントへのアクセスに失敗しました');
    }
  }

  async function handleViewAs(user: User) {
    try {
      const { token, user: targetUser } = await viewAsUser(user.id);
      startViewAs(token, targetUser);
      onClose();
      toast.success(lang === 'en' ? `Viewing ${user.name}'s dashboard (read-only)` : `${user.name} のダッシュボードを閲覧中（読み取り専用）`);
    } catch {
      toast.error(lang === 'en' ? 'Failed to view account' : 'アカウントの閲覧に失敗しました');
    }
  }

  async function handleSendInvite() {
    if (!inviteForm.email) { toast.error('Please enter an email address'); return; }
    setInviting(true);
    try {
      await sendInvite(inviteForm.email, inviteForm.role);
      toast.success(`Invite sent to ${inviteForm.email}`);
      setInviteForm({ email: '', role: 'EDITOR' });
      setShowInvitePanel(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to send invite';
      toast.error(msg);
    } finally {
      setInviting(false);
    }
  }

  async function handleEditAs(user: User) {
    try {
      const { token, user: targetUser } = await editAsUser(user.id);
      startImpersonation(token, targetUser);
      onClose();
      toast.success(lang === 'en' ? `Editing as ${user.name}` : `${user.name} として編集中`);
    } catch {
      toast.error(lang === 'en' ? 'Failed to edit account' : 'アカウントの編集に失敗しました');
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-bg1 border border-bd rounded-[14px] w-full max-w-[680px] max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-[18px] border-b border-bd">
          <h2 className="text-t1 font-bold text-base flex items-center gap-2.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-aP">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            {t('usersTitle')}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInvitePanel((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-aB/10 hover:bg-aB/20 text-aB text-xs font-semibold rounded-lg border border-aB/20 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              Invite User
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-t2 hover:bg-bg2 hover:text-t1 transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Invite User Panel */}
          {showInvitePanel && (
            <div className="bg-aB/[0.06] border border-aB/20 rounded-[10px] px-5 py-4">
              <h3 className="text-aB text-xs font-semibold mb-3 flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                Invite via Email
              </h3>
              <p className="text-t2 text-[11px] mb-3 leading-relaxed">
                Send an invitation email. The recipient gets a link to create their account.
              </p>
              <div className="flex gap-2.5 items-end flex-wrap">
                <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
                  <label className="text-t2 text-[11px] font-mono">Email address</label>
                  <input
                    type="email"
                    placeholder="colleague@example.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSendInvite(); }}
                    className="bg-bg1 border border-bd rounded-md px-2.5 py-[7px] text-t1 text-xs focus:outline-none focus:border-aB w-full"
                  />
                </div>
                <div className="flex flex-col gap-1 min-w-[110px]">
                  <label className="text-t2 text-[11px] font-mono">{t('usersRole')}</label>
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm((p) => ({ ...p, role: e.target.value }))}
                    className="bg-bg1 border border-bd rounded-md px-2.5 py-[7px] text-t1 text-xs focus:outline-none focus:border-aB cursor-pointer appearance-none"
                  >
                    <option value="EDITOR">{t('roleEditor')}</option>
                    <option value="VIEWER">{t('roleViewer')}</option>
                    <option value="ADMIN">{t('roleAdmin')}</option>
                  </select>
                </div>
                <button
                  onClick={handleSendInvite}
                  disabled={inviting}
                  className="px-[18px] py-[7px] bg-aB hover:bg-[#4c97f5] disabled:opacity-50 disabled:cursor-not-allowed text-bg0 text-xs font-semibold rounded-md transition-colors whitespace-nowrap h-[34px]"
                >
                  {inviting ? 'Sending…' : 'Send Invite'}
                </button>
              </div>
            </div>
          )}

          {/* Add User Form */}
          <div className="bg-bg0 border border-bd rounded-[10px] px-5 py-4">
            <h3 className="text-aG text-xs font-semibold mb-3.5 flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <path d="M20 8v6M23 11h-6" />
              </svg>
              {t('usersAddUser')}
            </h3>
            <div className="flex gap-2.5 items-end flex-wrap">
              {[
                { label: t('usersName'), placeholder: t('usersNamePlaceholder'), type: 'text', key: 'name' },
                { label: t('usersEmail'), placeholder: 'user@example.com', type: 'email', key: 'email' },
                { label: t('usersPassword'), placeholder: t('usersPasswordPlaceholder'), type: 'password', key: 'password' },
              ].map((f) => (
                <div key={f.key} className="flex flex-col gap-1 flex-1 min-w-[130px]">
                  <label className="text-t2 text-[11px] font-mono">{f.label}</label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    value={form[f.key as keyof typeof form]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    className="bg-bg1 border border-bd rounded-md px-2.5 py-[7px] text-t1 text-xs focus:outline-none focus:border-aB w-full"
                  />
                </div>
              ))}
              <div className="flex flex-col gap-1 min-w-[110px]">
                <label className="text-t2 text-[11px] font-mono">{t('usersRole')}</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
                  className="bg-bg1 border border-bd rounded-md px-2.5 py-[7px] text-t1 text-xs focus:outline-none focus:border-aB cursor-pointer appearance-none"
                >
                  <option value="EDITOR">{t('roleEditor')}</option>
                  <option value="VIEWER">{t('roleViewer')}</option>
                  <option value="ADMIN">{t('roleAdmin')}</option>
                </select>
              </div>
              <button
                onClick={handleCreate}
                className="px-[18px] py-[7px] bg-aG hover:bg-[#37a648] text-white text-xs font-semibold rounded-md transition-colors whitespace-nowrap h-[34px]"
              >
                {t('usersAdd')}
              </button>
            </div>
          </div>

          {/* User Table */}
          <div className="bg-bg0 border border-bd rounded-[10px] overflow-hidden">
            {loading ? (
              <div className="text-center py-8 text-t2 text-sm">{t('usersLoading')}</div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-bg2">
                    {[t('usersColUser'), t('usersColRole'), t('usersColStatus'), t('usersColLastLogin'), ''].map((h, i) => (
                      <th key={i} className="px-3.5 py-2.5 text-left font-mono text-[11px] font-semibold uppercase tracking-wider text-tM border-b border-bd">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.id} className="border-b border-bd/50 hover:bg-aB/[0.04] transition-colors">
                      {/* User info */}
                      <td className="px-3.5 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                            style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                          >
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-t1 text-xs font-medium">
                              {u.name}
                              {u.id === currentUser?.id && (
                                <span className="ml-1.5 text-aG text-[10px]">{t('usersYou')}</span>
                              )}
                            </div>
                            <div className="text-t2 text-[11px] font-mono">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      {/* Role — click to cycle */}
                      <td className="px-3.5 py-2.5">
                        {u.id === currentUser?.id ? (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium ${ROLE_COLORS[u.role as Role]}`}>
                            {getRoleLabel(u.role as Role)}
                          </span>
                        ) : (
                          <button
                            onClick={() => handleCycleRole(u)}
                            title={t('usersClickRole')}
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium transition-opacity hover:opacity-75 ${ROLE_COLORS[u.role as Role]}`}
                          >
                            {getRoleLabel(u.role as Role)}
                          </button>
                        )}
                      </td>
                      {/* Status */}
                      <td className="px-3.5 py-2.5">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className={`w-1.5 h-1.5 rounded-full ${u.active ? 'bg-aG' : 'bg-tM'}`} />
                          {u.active ? t('usersActive') : t('usersInactive')}
                        </div>
                      </td>
                      {/* Last login */}
                      <td className="px-3.5 py-2.5 text-t2 text-xs">
                        {u.lastLogin
                          ? new Date(u.lastLogin).toLocaleString(lang === 'ja' ? 'ja-JP' : 'en-US')
                          : '—'}
                      </td>
                      {/* Actions */}
                      <td className="px-3.5 py-2.5">
                        {u.id !== currentUser?.id && (
                          <div className="flex gap-1">
                            {/* View as (read-only) — ADMIN and SUPERADMIN */}
                            {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPERADMIN') &&
                              u.role !== 'SUPERADMIN' &&
                              !(currentUser?.role === 'ADMIN' && u.role === 'ADMIN') && (
                              <button
                                onClick={() => handleViewAs(u)}
                                title={lang === 'en' ? `View ${u.name}'s dashboard (read-only)` : `${u.name} のダッシュボードを閲覧（読み取り専用）`}
                                className="w-[30px] h-[30px] flex items-center justify-center rounded-md text-tM hover:bg-aC/15 hover:text-aC transition-colors border-0 bg-transparent"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[17px] h-[17px]">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                  <circle cx="12" cy="12" r="3"/>
                                </svg>
                              </button>
                            )}
                            {/* Edit as (full edit) — ADMIN and SUPERADMIN */}
                            {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPERADMIN') &&
                              u.role !== 'SUPERADMIN' &&
                              !(currentUser?.role === 'ADMIN' && u.role === 'ADMIN') && (
                              <button
                                onClick={() => handleEditAs(u)}
                                title={lang === 'en' ? `Edit as ${u.name}` : `${u.name} として編集`}
                                className="w-[30px] h-[30px] flex items-center justify-center rounded-md text-tM hover:bg-aG/15 hover:text-aG transition-colors border-0 bg-transparent"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[17px] h-[17px]">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                              </button>
                            )}
                            {/* Full access — SUPERADMIN only */}
                            {currentUser?.role === 'SUPERADMIN' && u.role !== 'SUPERADMIN' && (
                              <button
                                onClick={() => handleImpersonate(u)}
                                title={lang === 'en' ? `Access as ${u.name}` : `${u.name} としてアクセス`}
                                className="w-[30px] h-[30px] flex items-center justify-center rounded-md text-tM hover:bg-aO/15 hover:text-aO transition-colors border-0 bg-transparent"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[17px] h-[17px]">
                                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                                  <polyline points="10 17 15 12 10 7"/>
                                  <line x1="15" y1="12" x2="3" y2="12"/>
                                </svg>
                              </button>
                            )}
                            <button
                              onClick={() => handleToggleActive(u)}
                              title={u.active ? t('usersDeactivate') : t('usersActivate')}
                              className="w-[30px] h-[30px] flex items-center justify-center rounded-md text-tM hover:bg-bg2 hover:text-t1 transition-colors border-0 bg-transparent"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[17px] h-[17px]">
                                {u.active
                                  ? <><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></>
                                  : <path d="M20 6L9 17l-5-5"/>
                                }
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(u)}
                              title={t('usersDeleteBtn')}
                              className="w-[30px] h-[30px] flex items-center justify-center rounded-md text-tM hover:bg-aR/15 hover:text-aR transition-colors border-0 bg-transparent"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[17px] h-[17px]">
                                <path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                              </svg>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
