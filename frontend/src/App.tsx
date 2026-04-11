import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import LoginScreen from './components/auth/LoginScreen';
import Titlebar from './components/layout/Titlebar';
import ActivityBar from './components/layout/ActivityBar';
import Statusbar from './components/layout/Statusbar';
import TopicCreator from './pages/TopicCreator';
import ArticleCreator from './pages/ArticleCreator';
import InstagramPanel from './pages/InstagramPanel';
import VideoScriptCreator from './pages/VideoScriptCreator';
import HeygenAvatarsPage from './pages/HeygenAvatarsPage';
import UserModal from './components/user/UserModal';
import UserSettingsModal from './components/user/UserSettingsModal';
import SettingsModal from './components/user/SettingsModal';
import AcceptInvite from './pages/AcceptInvite';

function getInviteToken(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('invite');
}

function AppShell() {
  const { user, loading, isImpersonating, isViewingAs, returnToAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'topic' | 'article' | 'video' | 'avatars' | 'instagram'>('topic');
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userModalInvite, setUserModalInvite] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [apiSettingsModalOpen, setApiSettingsModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg0 flex items-center justify-center">
        <span className="text-t2 text-sm">Loading…</span>
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  const sectionLabel =
    activeTab === 'topic' ? 'Topic Creator' :
    activeTab === 'article' ? 'Article Creator' :
    activeTab === 'video' ? 'Video Script' :
    activeTab === 'avatars' ? 'HeyGen Avatars' :
    'Instagram Publisher';

  return (
    <div className="flex flex-col h-screen">
      {isImpersonating && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-aO text-white text-xs font-medium shrink-0 z-50">
          <span>Accessing as <strong>{user.name}</strong> ({user.email})</span>
          <button
            onClick={returnToAdmin}
            className="ml-4 px-3 py-0.5 bg-white/20 hover:bg-white/30 rounded text-white text-xs font-semibold transition-colors"
          >
            Return to Admin
          </button>
        </div>
      )}
      {isViewingAs && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-aC/80 text-bg0 text-xs font-medium shrink-0 z-50">
          <span className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 shrink-0">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            Viewing <strong className="mx-1">{user.name}</strong>'s dashboard — read-only
          </span>
          <button
            onClick={returnToAdmin}
            className="ml-4 px-3 py-0.5 bg-bg0/20 hover:bg-bg0/30 rounded text-bg0 text-xs font-semibold transition-colors"
          >
            Exit View
          </button>
        </div>
      )}
      <Titlebar onOpenUsers={() => { setUserModalInvite(false); setUserModalOpen(true); }} onOpenSettings={() => setSettingsModalOpen(true)} onInviteUser={() => { setUserModalInvite(true); setUserModalOpen(true); }} />
      <div className="flex flex-1 overflow-hidden">
        <ActivityBar active={activeTab} onChange={(tab) => setActiveTab(tab as 'topic' | 'article' | 'video' | 'avatars' | 'instagram')} />
        {activeTab === 'topic' ? <TopicCreator />
          : activeTab === 'article' ? <ArticleCreator />
          : activeTab === 'video' ? <VideoScriptCreator />
          : activeTab === 'avatars' ? <HeygenAvatarsPage />
          : <InstagramPanel />}
      </div>
      <Statusbar section={sectionLabel} onOpenSettings={() => setApiSettingsModalOpen(true)} />
      {userModalOpen && <UserModal onClose={() => setUserModalOpen(false)} defaultShowInvite={userModalInvite} />}
      {settingsModalOpen && <UserSettingsModal onClose={() => setSettingsModalOpen(false)} />}
      {apiSettingsModalOpen && <SettingsModal onClose={() => setApiSettingsModalOpen(false)} />}
    </div>
  );
}

function InviteGate() {
  const inviteToken = getInviteToken();
  const [dismissed, setDismissed] = useState(false);

  if (inviteToken && !dismissed) {
    return <AcceptInvite token={inviteToken} onDismiss={() => setDismissed(true)} />;
  }
  return <AppShell />;
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#21262d',
              color: '#e6edf3',
              border: '1px solid #30363d',
              fontSize: '13px',
            },
          }}
        />
        <InviteGate />
      </AuthProvider>
    </LanguageProvider>
  );
}
