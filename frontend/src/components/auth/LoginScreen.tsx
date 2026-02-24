import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { login as apiLogin } from '../../api/auth';
import toast from 'react-hot-toast';

export default function LoginScreen() {
  const { login } = useAuth();
  const { lang, t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError(t('authErrorEmpty'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { token, user } = await apiLogin(email, password);
      login(token, user);
      toast.success(lang === 'en' ? `Welcome, ${user.name}!` : `ようこそ、${user.name} さん`);
    } catch {
      setError(t('authErrorInvalid'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg0 flex items-center justify-center p-4">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-12 h-12 text-aB mx-auto mb-3"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <h1 className="text-xl font-bold text-t1 tracking-tight">Content Creator Studio</h1>
          <p className="text-t2 text-xs mt-1.5 font-mono">{t('authSubtitle')}</p>
        </div>

        {/* Card */}
        <div className="bg-bg1 border border-bd rounded-2xl p-10 shadow-2xl space-y-4">
          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-aR/10 border border-aR/30 rounded-lg px-3 py-2.5 text-aR text-xs">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 shrink-0">
                <circle cx="12" cy="12" r="10" />
                <path d="M15 9l-6 6M9 9l6 6" />
              </svg>
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-t2 text-xs font-medium">{t('authEmail')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && document.getElementById('passInput')?.focus()}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full bg-bg0 border border-bd rounded-lg px-3.5 py-2.5 text-t1 text-sm placeholder-tM focus:outline-none focus:border-aB focus:shadow-[0_0_0_3px_rgba(88,166,255,0.12)] transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-t2 text-xs font-medium">{t('authPassword')}</label>
            <input
              id="passInput"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e as unknown as FormEvent)}
              placeholder={t('authPasswordPlaceholder')}
              autoComplete="current-password"
              className="w-full bg-bg0 border border-bd rounded-lg px-3.5 py-2.5 text-t1 text-sm placeholder-tM focus:outline-none focus:border-aB focus:shadow-[0_0_0_3px_rgba(88,166,255,0.12)] transition-all"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full mt-1 bg-aB hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-all hover:-translate-y-px hover:shadow-[0_4px_14px_rgba(88,166,255,0.3)] active:translate-y-0"
          >
            {loading ? t('authLoggingIn') : t('authLoginBtn')}
          </button>
        </div>

        <p className="text-center mt-5 text-tM text-xs">© 2026 Content Creator Studio</p>
      </div>
    </div>
  );
}
