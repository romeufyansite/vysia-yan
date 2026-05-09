import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MembershipProvider } from './contexts/MembershipContext';
import { TeamPage } from './pages/TeamPage';
import { InvitationPage } from './pages/InvitationPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { MainLayout } from './components/layout/MainLayout';
import { ScreensPage } from './pages/ScreensPage';
import { ScreenEditorPage } from './pages/ScreenEditorPage';
import { PlaylistsPage } from './pages/PlaylistsPage';
import { PlaylistEditorPage } from './pages/PlaylistEditorPage';
import { PlayerPage } from './pages/PlayerPage';
import { PlayerRunPage } from './pages/PlayerRunPage';
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ProfilePage } from './pages/ProfilePage';
import { CompanyPage } from './pages/CompanyPage';
import { CompanyEditorPage } from './pages/CompanyEditorPage';
import { Toaster } from './components/ui/sonner';

function AppContent() {
  const { user, loading } = useAuth();
  const [route, setRoute] = useState<{ page: string; params?: Record<string, string> }>({
    page: 'screens',
  });

  console.log('📱 AppContent render - loading:', loading, 'user:', user ? 'logged in' : 'not logged in', 'route:', route.page);

  useEffect(() => {
    const handleHashChange = () => {
      // Invitation links arrive with ?invitation_token= in the query string
      // (regardless of hash routing) because Supabase auth redirects append
      // query params to the redirectTo URL.
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('invitation_token')) {
        setRoute({ page: 'invite' });
        return;
      }

      const hash = window.location.hash;
      const path = hash ? hash.slice(1) : '/';

      console.log('🔀 Route change - hash:', hash, 'path:', path);

      if (path === '/player') {
        console.log('→ Setting route to player');
        setRoute({ page: 'player' });
      } else if (path === '/player/run') {
        console.log('→ Setting route to player-run');
        setRoute({ page: 'player-run' });
      } else if (path === '/login') {
        console.log('→ Setting route to login');
        setRoute({ page: 'login' });
      } else if (path === '/forgot-password') {
        console.log('→ Setting route to forgot-password');
        setRoute({ page: 'forgot-password' });
      } else if (path === '/' || path === '/screens' || path === '') {
        console.log('→ Setting route to screens');
        setRoute({ page: 'screens' });
      } else if (path === '/playlists' || path.startsWith('/playlists?')) {
        console.log('→ Setting route to playlists');
        setRoute({ page: 'playlists' });
      } else if (path.includes('/playlists/')) {
        const playlistId = path.split('/playlists/')[1];
        console.log('→ Setting route to playlist-editor with id:', playlistId);
        setRoute({ page: 'playlist-editor', params: { playlistId } });
      } else if (path.includes('/screens/')) {
        const screenId = path.split('/screens/')[1];
        console.log('→ Setting route to screen-editor with id:', screenId);
        setRoute({ page: 'screen-editor', params: { screenId } });
      } else if (path === '/settings/profil') {
        setRoute({ page: 'settings-profile' });
      } else if (path === '/settings/equipe') {
        setRoute({ page: 'settings-team' });
      } else if (path.startsWith('/invite')) {
        setRoute({ page: 'invite' });
      } else if (path === '/settings/entreprise') {
        setRoute({ page: 'settings-company' });
      } else if (path.startsWith('/settings/entreprise/')) {
        const orgId = path.split('/settings/entreprise/')[1];
        setRoute({ page: 'settings-company-editor', params: { orgId } });
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (route.page === 'login') {
    if (user) {
      window.location.hash = '/screens';
      return null;
    }
    return (
      <>
        <LoginPage />
        <Toaster />
      </>
    );
  }

  if (route.page === 'forgot-password') {
    if (user) {
      window.location.hash = '/screens';
      return null;
    }
    return (
      <>
        <ForgotPasswordPage />
        <Toaster />
      </>
    );
  }

  if (route.page === 'player') {
    return (
      <>
        <PlayerPage />
        <Toaster />
      </>
    );
  }

  if (route.page === 'player-run') {
    return (
      <>
        <PlayerRunPage />
        <Toaster />
      </>
    );
  }

  if (route.page === 'screen-editor' && route.params?.screenId) {
    return (
      <>
        <ProtectedRoute>
          <ScreenEditorPage screenId={route.params.screenId} />
        </ProtectedRoute>
        <Toaster />
      </>
    );
  }

  if (route.page === 'playlists') {
    return (
      <>
        <ProtectedRoute>
          <MainLayout>
            <PlaylistsPage />
          </MainLayout>
        </ProtectedRoute>
        <Toaster />
      </>
    );
  }

  if (route.page === 'playlist-editor' && route.params?.playlistId) {
    return (
      <>
        <ProtectedRoute>
          <PlaylistEditorPage playlistId={route.params.playlistId} />
        </ProtectedRoute>
        <Toaster />
      </>
    );
  }

  if (route.page === 'settings-profile') {
    return (
      <>
        <ProtectedRoute>
          <MainLayout>
            <ProfilePage />
          </MainLayout>
        </ProtectedRoute>
        <Toaster />
      </>
    );
  }

  if (route.page === 'invite') {
    return (
      <>
        <InvitationPage />
        <Toaster />
      </>
    );
  }

  if (route.page === 'settings-team') {
    return (
      <>
        <ProtectedRoute>
          <MainLayout>
            <TeamPage />
          </MainLayout>
        </ProtectedRoute>
        <Toaster />
      </>
    );
  }

  if (route.page === 'settings-company') {
    return (
      <>
        <ProtectedRoute>
          <MainLayout>
            <CompanyPage />
          </MainLayout>
        </ProtectedRoute>
        <Toaster />
      </>
    );
  }

  if (route.page === 'settings-company-editor' && route.params?.orgId) {
    return (
      <>
        <ProtectedRoute>
          <MainLayout>
            <CompanyEditorPage orgId={route.params.orgId} />
          </MainLayout>
        </ProtectedRoute>
        <Toaster />
      </>
    );
  }

  return (
    <>
      <ProtectedRoute>
        <MainLayout>
          <ScreensPage />
        </MainLayout>
      </ProtectedRoute>
      <Toaster />
    </>
  );
}

function App() {
  console.log('🚀 App component mounting...');
  return (
    <AuthProvider>
      <MembershipProvider>
        <AppContent />
      </MembershipProvider>
    </AuthProvider>
  );
}

export default App;
