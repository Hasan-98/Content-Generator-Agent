import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import LoginScreen from './components/auth/LoginScreen';
import Titlebar from './components/layout/Titlebar';
import ActivityBar from './components/layout/ActivityBar';
import Statusbar from './components/layout/Statusbar';
import TopicCreator from './pages/TopicCreator';
import PlaceholderPage from './pages/PlaceholderPage';
import UserModal from './components/user/UserModal';

function AppShell() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('topics');
  const [userModalOpen, setUserModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg0 flex items-center justify-center">
        <span className="text-t2 text-sm">Loading…</span>
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  function renderContent() {
    switch (activeTab) {
      case 'topics':
        return <TopicCreator />;
      case 'persona':
        return (
          <PlaceholderPage
            icon="👤"
            title="Persona Creator"
            description="Define target audience personas per keyword"
          />
        );
      case 'structure':
        return (
          <PlaceholderPage
            icon="🗂"
            title="Structure Creator"
            description="Build article outlines and section structure"
          />
        );
      case 'blog':
        return (
          <PlaceholderPage
            icon="✍️"
            title="Blog Creator"
            description="Write and manage full blog content"
          />
        );
      case 'image':
        return (
          <PlaceholderPage
            icon="🖼"
            title="Image Creator"
            description="Generate and manage images based on blog content"
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <Titlebar onOpenUsers={() => setUserModalOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <ActivityBar active={activeTab} onChange={setActiveTab} />
        {renderContent()}
      </div>
      <Statusbar section={activeTab === 'topics' ? 'Topic Creator' : activeTab === 'persona' ? 'Persona Creator' : activeTab === 'structure' ? 'Structure Creator' : activeTab === 'blog' ? 'Blog Creator' : 'Image Creator'} />
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
