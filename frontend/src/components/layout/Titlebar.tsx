import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

interface Props {
  onOpenUsers: () => void;
  onOpenSettings: () => void;
}

export default function Titlebar({ onOpenUsers, onOpenSettings }: Props) {
  const { user, logout } = useAuth();
  const { lang, toggle, t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="h-[38px] bg-bg1 border-b border-bd flex items-center px-4 gap-3 shrink-0 z-50 relative">
      {/* Traffic light dots */}
      <div className="flex gap-2">
        <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
        <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
        <div className="w-3 h-3 rounded-full bg-[#28c840]" />
      </div>

      {/* Title */}
      <div className="flex-1 text-center font-mono text-xs text-t2 tracking-wide">
        {t('appTitle')}
      </div>

      {/* Language toggle */}
      <div className="flex items-center border border-bd rounded-md overflow-hidden">
        <button
          onClick={() => lang !== 'en' && toggle()}
          className={`px-2 py-0.5 text-[11px] font-mono transition-colors ${
            lang === 'en' ? 'bg-aB/20 text-aB' : 'text-tM hover:text-t2'
          }`}
        >
          EN
        </button>
        <div className="w-px h-3 bg-bd" />
        <button
          onClick={() => lang !== 'ja' && toggle()}
          className={`px-2 py-0.5 text-[11px] font-mono transition-colors ${
            lang === 'ja' ? 'bg-aB/20 text-aB' : 'text-tM hover:text-t2'
          }`}
        >
          日本語
        </button>
      </div>

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 px-2.5 py-1 rounded-md hover:bg-bg2 transition-colors"
        >
          <div className="w-[22px] h-[22px] rounded-full bg-aP flex items-center justify-center text-white text-[10px] font-bold">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <span className="text-t2 text-xs">{user?.name}</span>
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-full mt-1 w-[200px] bg-bg1 border border-bd rounded-[10px] py-1.5 shadow-2xl z-50">
              {(user?.role === 'ADMIN' || user?.role === 'SUPERADMIN') && (
                <button
                  onClick={() => { setMenuOpen(false); onOpenUsers(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-t2 text-xs hover:bg-bg2 hover:text-t1 transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[17px] h-[17px] shrink-0">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  {t('titlebarUserMgmt')}
                </button>
              )}
              <button
                onClick={() => { setMenuOpen(false); onOpenSettings(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-t2 text-xs hover:bg-bg2 hover:text-t1 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[17px] h-[17px] shrink-0">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {t('titlebarAccountSettings')}
              </button>
              <div className="h-px bg-bd mx-1 my-1" />
              <button
                onClick={() => { setMenuOpen(false); logout(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-aR text-xs hover:bg-aR/10 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[17px] h-[17px] shrink-0">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                {t('titlebarLogout')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
