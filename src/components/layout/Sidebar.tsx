import { Monitor, List, Calendar, Layers, Library, Settings, ChevronDown, LogOut, ListIndentDecrease, ListIndentIncrease } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMembership } from '@/contexts/MembershipContext';
import { toast } from 'sonner';
import { MediaLibraryModal } from '@/components/media-library/MediaLibraryModal';
import { OrganizationSwitcher } from './OrganizationSwitcher';
import type { Resource } from '@/lib/permissions';

const navigationItems: { name: string; icon: typeof Monitor; path: string; resource: Resource }[] = [
  { name: 'Écrans', icon: Monitor, path: '/screens', resource: 'screens' },
  { name: 'Playlists', icon: List, path: '/playlists', resource: 'playlists' },
  { name: 'Programmation', icon: Calendar, path: '/programmation', resource: 'programmation' },
  { name: 'Séquence', icon: Layers, path: '/sequence', resource: 'sequence' },
];

const settingsItems: { label: string; path: string; managerOnly?: boolean; resource?: Resource }[] = [
  { label: 'Profil', path: '/settings/profil' },
  { label: 'Équipe', path: '/settings/equipe', managerOnly: true },
  { label: 'Entreprise', path: '/settings/entreprise', resource: 'company' },
  { label: 'Abonnement', path: '/settings/abonnement', managerOnly: true },
];

interface SidebarProps {
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
  onNavigate?: () => void;
}

export function Sidebar({ isOpen, onToggle, onNavigate }: SidebarProps = {}) {
  const [currentPath, setCurrentPath] = useState(window.location.hash.slice(1) || '/screens');
  const [settingsOpen, setSettingsOpen] = useState(() => currentPath.startsWith('/settings'));
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { signOut } = useAuth();
  const { membership, can } = useMembership();
  const isManager = membership?.role === 'manager';

  const visibleNav = navigationItems.filter((item) => can(item.resource));
  const canAccessMediaLibrary = can('media_library');
  const visibleSettings = settingsItems.filter((item) => {
    if (item.managerOnly) return isManager;
    if (item.resource) return can(item.resource);
    return true;
  });

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile && !isCollapsed) {
        setIsCollapsed(true);
      } else if (!mobile && isCollapsed) {
        setIsCollapsed(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile && isOpen !== undefined) {
      setIsCollapsed(!isOpen);
    }
  }, [isOpen, isMobile]);

  // Keep currentPath in sync with hash changes
  useEffect(() => {
    const onHashChange = () => {
      const path = window.location.hash.slice(1) || '/screens';
      setCurrentPath(path);
      if (!path.startsWith('/settings')) {
        setSettingsOpen(false);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Déconnexion réussie');
      window.location.hash = '/login';
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Erreur lors de la déconnexion');
    }
  };

  const handleNavigate = (path: string) => {
    window.location.hash = path;
    setCurrentPath(path);
    if (!path.startsWith('/settings')) {
      setSettingsOpen(false);
    }
    if (onNavigate) {
      onNavigate();
    }
  };

  const toggleSidebar = () => {
    if (isMobile && onToggle) {
      onToggle(!isOpen);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <aside className={`h-screen bg-white border-r border-slate-200/80 flex flex-col transition-all duration-300 ${
      isMobile ? 'fixed left-0 top-0 z-50 w-64' : 'relative'
    } ${
      isMobile && isCollapsed ? '-translate-x-full' : 'translate-x-0'
    } ${
      !isMobile && isCollapsed ? 'w-[88px]' : !isMobile ? 'w-64' : ''
    }`}>
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 p-4 py-6">
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-2 flex-1">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                V
              </div>
              <span className="text-lg font-bold text-slate-800">Vysia</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="h-8 w-8 shrink-0 rounded-lg hover:bg-slate-100"
            >
              <ListIndentDecrease className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
              V
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="h-8 w-8 shrink-0 rounded-lg hover:bg-slate-100"
            >
              <ListIndentIncrease className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {/* Organization switcher — placed above all navigation items */}
        <div className={`${isCollapsed ? '' : 'pb-2'}`}>
          <OrganizationSwitcher collapsed={isCollapsed} />
        </div>

        {visibleNav.map((item) => {
          const isActive = currentPath === item.path || currentPath.startsWith(item.path + '/');
          return (
            <Button
              key={item.name}
              variant={isActive ? 'secondary' : 'ghost'}
              onClick={() => handleNavigate(item.path)}
              className={`w-full ${isCollapsed ? 'justify-center px-0' : 'justify-start'} h-11 rounded-xl font-medium ${
                isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600'
              }`}
              title={isCollapsed ? item.name : undefined}
            >
              <item.icon className={`h-5 w-5 ${!isCollapsed ? 'mr-3' : ''}`} />
              {!isCollapsed && item.name}
            </Button>
          );
        })}

        {canAccessMediaLibrary && (
          <Button
            variant="ghost"
            onClick={() => setMediaLibraryOpen(true)}
            className={`w-full ${isCollapsed ? 'justify-center px-0' : 'justify-start'} h-11 rounded-xl font-medium text-slate-600`}
            title={isCollapsed ? 'Média librairie' : undefined}
          >
            <Library className={`h-5 w-5 ${!isCollapsed ? 'mr-3' : ''}`} />
            {!isCollapsed && 'Média librairie'}
          </Button>
        )}
      </nav>

      <div className="space-y-1 border-t border-slate-200/80 p-4">
        {!isCollapsed && (
          <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="h-11 w-full justify-between rounded-xl font-medium text-slate-600"
              >
                <div className="flex items-center">
                  <Settings className="h-5 w-5 mr-3" />
                  Paramètres
                </div>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${settingsOpen ? 'rotate-180' : ''}`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="ml-8 mt-1 space-y-1">
              {visibleSettings.map((item) => {
                const isActive = currentPath === item.path || currentPath.startsWith(item.path + '/');
                return (
                  <Button
                    key={item.path}
                    variant="ghost"
                    onClick={() => handleNavigate(item.path)}
                    className={`h-9 w-full justify-start rounded-lg text-sm ${
                      isActive ? 'bg-slate-100 font-medium text-slate-900' : 'text-slate-600'
                    }`}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        )}

        {isCollapsed && (
          <Button
            variant="ghost"
            onClick={() => handleNavigate('/settings/profil')}
            className="h-11 w-full justify-center rounded-xl px-0 font-medium text-slate-600"
            title="Paramètres"
          >
            <Settings className="h-5 w-5" />
          </Button>
        )}

        <Button
          variant="ghost"
          onClick={handleSignOut}
          className={`w-full ${isCollapsed ? 'justify-center px-0' : 'justify-start'} h-11 rounded-xl text-red-600 font-medium hover:text-red-700 hover:bg-red-50`}
          title={isCollapsed ? 'Déconnexion' : undefined}
        >
          <LogOut className={`h-5 w-5 ${!isCollapsed ? 'mr-3' : ''}`} />
          {!isCollapsed && 'Déconnexion'}
        </Button>
      </div>

      <MediaLibraryModal open={mediaLibraryOpen} onOpenChange={setMediaLibraryOpen} />
    </aside>
  );
}
