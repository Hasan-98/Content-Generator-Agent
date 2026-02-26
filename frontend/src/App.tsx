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
import UserModal from './components/user/UserModal';

function AppShell() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'topic' | 'article'>('topic');
  const [userModalOpen, setUserModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg0 flex items-center justify-center">
        <span className="text-t2 text-sm">Loading…</span>
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  const sectionLabel = activeTab === 'topic' ? 'Topic Creator' : 'Article Creator';

  return (
    <div className="flex flex-col h-screen">
      <Titlebar onOpenUsers={() => setUserModalOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <ActivityBar active={activeTab} onChange={(tab) => setActiveTab(tab as 'topic' | 'article')} />
        {activeTab === 'topic' ? <TopicCreator /> : <ArticleCreator />}
      </div>
      <Statusbar section={sectionLabel} />
      {userModalOpen && <UserModal onClose={() => setUserModalOpen(false)} />}
    </div>
  );
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
        <AppShell />
      </AuthProvider>
    </LanguageProvider>
  );
}
