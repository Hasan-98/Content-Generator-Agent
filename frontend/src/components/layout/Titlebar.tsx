import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface Props {
  onOpenUsers: () => void;
}

export default function Titlebar({ onOpenUsers }: Props) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="h-[38px] bg-bg1 border-b border-bd flex items-center justify-between px-4 shrink-0 z-50">
      <div className="flex items-center gap-2">
        <span className="text-aB font-mono font-medium text-sm">Content Creator Studio</span>
      </div>

      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 px-2 py-1 rounded hover:bg-bg2 transition-colors"
        >
          <div className="w-6 h-6 rounded-full bg-aB flex items-center justify-center text-bg0 text-xs font-bold">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <span className="text-t2 text-xs">{user?.name}</span>
          <span className="text-tM text-xs">▾</span>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-48 bg-bg2 border border-bd rounded shadow-lg z-50">
            <div className="px-3 py-2 border-b border-bd">
              <div className="text-t1 text-xs font-medium">{user?.name}</div>
              <div className="text-t2 text-xs">{user?.email}</div>
              <div className="text-tM text-xs mt-0.5">{user?.role}</div>
            </div>
            {user?.role === 'ADMIN' && (
              <button
                onClick={() => { setMenuOpen(false); onOpenUsers(); }}
                className="w-full text-left px-3 py-2 text-t2 text-xs hover:bg-bg1 hover:text-t1 transition-colors"
              >
                Manage Users
              </button>
            )}
            <button
              onClick={() => { setMenuOpen(false); logout(); }}
              className="w-full text-left px-3 py-2 text-aR text-xs hover:bg-bg1 transition-colors"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
