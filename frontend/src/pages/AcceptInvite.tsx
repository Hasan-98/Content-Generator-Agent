import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { validateInvite, acceptInvite } from '../api/invites';
import { useAuth } from '../context/AuthContext';
import type { AuthUser } from '../types';

interface Props {
  token: string;
  onDismiss: () => void;
}

type PageState = 'loading' | 'form' | 'error';

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-aP/15 text-aP',
  EDITOR: 'bg-aB/15 text-aB',
  VIEWER: 'bg-t2/15 text-t2',
};

export default function AcceptInvite({ token, onDismiss }: Props) {
  const { login } = useAuth();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [inviteData, setInviteData] = useState<{ email: string; role: string; invitedBy: string } | null>(null);
  const [form, setForm] = useState({ name: '', password: '', confirm: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    validateInvite(token)
      .then((data) => {
        setInviteData(data);
        setPageState('form');
      })
      .catch((err) => {
        const msg = err?.response?.data?.error || 'Invalid or expired invite link.';
        setErrorMsg(msg);
        setPageState('error');
      });
  }, [token]);

  async function handleSubmit() {
    if (!form.name.trim()) { toast.error('Please enter your name'); return; }
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return; }

    setSubmitting(true);
    try {
      const result = await acceptInvite(token, form.name.trim(), form.password);
      login(result.token, result.user as AuthUser);
      // Remove ?invite= from URL without reload
      window.history.replaceState({}, '', window.location.pathname);
      toast.success(`Welcome, ${result.user.name}! Your account is ready.`);
      onDismiss();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create account. Please try again.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-bg0 flex items-center justify-center z-50 p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, #58a6ff 1px, transparent 0)',
        backgroundSize: '32px 32px',
      }} />

      <div className="relative w-full max-w-[440px]">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-9 h-9 bg-aB rounded-[10px] flex items-center justify-center shadow-lg">
            <span className="text-bg0 font-black text-xl">C</span>
          </div>
          <span className="text-t1 font-bold text-lg tracking-tight">Content Creator Studio</span>
        </div>

        {/* Card */}
        <div className="bg-bg1 border border-bd rounded-2xl overflow-hidden shadow-2xl">

          {/* Loading */}
          {pageState === 'loading' && (
            <div className="px-8 py-12 text-center">
              <div className="w-10 h-10 border-2 border-aB border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-t2 text-sm">Validating your invite…</p>
            </div>
          )}

          {/* Error */}
          {pageState === 'error' && (
            <div className="px-8 py-12 text-center">
              <div className="w-14 h-14 bg-aR/10 rounded-full flex items-center justify-center mx-auto mb-5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7 text-aR">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <h2 className="text-t1 font-bold text-lg mb-2">Invite Invalid</h2>
              <p className="text-t2 text-sm mb-6 leading-relaxed">{errorMsg}</p>
              <p className="text-tM text-xs">Please contact the person who invited you to send a new link.</p>
            </div>
          )}

          {/* Form */}
          {pageState === 'form' && inviteData && (
            <>
              {/* Header */}
              <div className="px-8 py-7 border-b border-bd bg-bg0/50">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 bg-aB/10 rounded-full flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-aB">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-t1 font-bold text-base leading-tight">Create your account</h1>
                    <p className="text-t2 text-xs mt-0.5">
                      Invited by <span className="text-aB font-semibold">{inviteData.invitedBy}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Invite details strip */}
              <div className="px-8 py-3 bg-bg2/50 border-b border-bd flex items-center gap-3">
                <div className="shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-tM">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <span className="text-t2 text-xs font-mono">{inviteData.email}</span>
                <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${ROLE_COLORS[inviteData.role] || ROLE_COLORS.EDITOR}`}>
                  {inviteData.role}
                </span>
              </div>

              {/* Form fields */}
              <div className="px-8 py-6 space-y-4">
                <div>
                  <label className="block text-t2 text-[11px] font-mono mb-1.5">Your name</label>
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full bg-bg0 border border-bd rounded-lg px-3 py-2.5 text-t1 text-sm focus:outline-none focus:border-aB transition-colors"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-t2 text-[11px] font-mono mb-1.5">Password</label>
                  <input
                    type="password"
                    placeholder="At least 8 characters"
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    className="w-full bg-bg0 border border-bd rounded-lg px-3 py-2.5 text-t1 text-sm focus:outline-none focus:border-aB transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-t2 text-[11px] font-mono mb-1.5">Confirm password</label>
                  <input
                    type="password"
                    placeholder="Re-enter your password"
                    value={form.confirm}
                    onChange={(e) => setForm((p) => ({ ...p, confirm: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                    className="w-full bg-bg0 border border-bd rounded-lg px-3 py-2.5 text-t1 text-sm focus:outline-none focus:border-aB transition-colors"
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full py-2.5 bg-aB hover:bg-[#4c97f5] disabled:opacity-50 disabled:cursor-not-allowed text-bg0 font-bold text-sm rounded-lg transition-colors mt-2"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-bg0 border-t-transparent rounded-full animate-spin" />
                      Creating account…
                    </span>
                  ) : 'Create Account & Join Workspace'}
                </button>
              </div>

              {/* Footer */}
              <div className="px-8 py-4 border-t border-bd bg-bg0/30 text-center">
                <p className="text-tM text-xs">
                  Your email address (<span className="text-t2">{inviteData.email}</span>) is pre-set from the invite.
                </p>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-tM text-xs mt-5">
          Already have an account?{' '}
          <button onClick={onDismiss} className="text-aB hover:underline">Sign in instead</button>
        </p>
      </div>
    </div>
  );
}
