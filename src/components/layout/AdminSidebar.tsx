import {
  LayoutDashboard,
  Settings,
  ChevronDown,
  LogOut,
  ListIndentDecrease,
  ListIndentIncrease,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AdminSidebarProps {
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
  onNavigate?: () => void;
}

export function AdminSidebar({ isOpen, onToggle, onNavigate }: AdminSidebarProps = {}) {
  const [currentPath, setCurrentPath] = useState(window.location.hash.slice(1) || '/admin');
  const [settingsOpen, setSettingsOpen] = useState(() => currentPath.startsWith('/admin/settings'));
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { signOut } = useAuth();

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

  useEffect(() => {
    const onHashChange = () => {
      const path = window.location.hash.slice(1) || '/admin';
      setCurrentPath(path);
      if (!path.startsWith('/admin/settings')) {
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
    if (!path.startsWith('/admin/settings')) {
      setSettingsOpen(false);
    }
    onNavigate?.();
  };

  const toggleSidebar = () => {
    if (isMobile && onToggle) {
      onToggle(!isOpen);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  const dashboardPaths = ['/admin', '/admin/dashboard'];
  const isDashboardActive = dashboardPaths.some(
    (p) => currentPath === p || currentPath.startsWith(`${p}?`),
  );

  const isSettingsGeneral =
    currentPath === '/admin/settings' || currentPath.startsWith('/admin/settings?');
  const isSettingsAi =
    currentPath === '/admin/settings/gestion-ia' ||
    currentPath.startsWith('/admin/settings/gestion-ia?');

  const settingsSubClass = (active: boolean) =>
    `h-9 w-full justify-start rounded-lg text-sm ${
      active
        ? 'border border-blue-200 bg-blue-50 font-semibold text-slate-900 shadow-sm'
        : 'border border-transparent font-normal text-slate-600 hover:bg-slate-50'
    }`;

  return (
    <aside
      className={`h-screen bg-white border-r border-slate-200/80 flex flex-col transition-all duration-300 ${
        isMobile ? 'fixed left-0 top-0 z-50 w-64' : 'relative'
      } ${isMobile && isCollapsed ? '-translate-x-full' : 'translate-x-0'} ${
        !isMobile && isCollapsed ? 'w-[88px]' : !isMobile ? 'w-64' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 p-4 py-6">
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-2 flex-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-medium text-white">
                V
              </div>
              <span className="text-lg font-medium text-slate-800">Vysia</span>
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
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-medium text-white">
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
        <Button
          variant={isDashboardActive ? 'secondary' : 'ghost'}
          onClick={() => handleNavigate('/admin')}
          className={`w-full ${isCollapsed ? 'justify-center px-0' : 'justify-start'} h-11 rounded-xl ${
            isDashboardActive ? 'bg-slate-100 font-medium text-slate-900' : 'font-normal text-slate-600'
          }`}
          title={isCollapsed ? 'Tableau de bord' : undefined}
        >
          <LayoutDashboard className={`h-5 w-5 ${!isCollapsed ? 'mr-3' : ''}`} />
          {!isCollapsed && 'Tableau de bord'}
        </Button>
      </nav>

      <div className="space-y-1 border-t border-slate-200/80 p-4">
        {!isCollapsed && (
          <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="h-11 w-full justify-between rounded-xl font-normal text-slate-600"
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
              <Button variant="ghost" onClick={() => handleNavigate('/admin/settings')} className={settingsSubClass(isSettingsGeneral)}>
                Général
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleNavigate('/admin/settings/gestion-ia')}
                className={settingsSubClass(isSettingsAi)}
              >
                Gestion IA
              </Button>
            </CollapsibleContent>
          </Collapsible>
        )}

        {isCollapsed && (
          <Button
            variant="ghost"
            onClick={() => handleNavigate('/admin/settings')}
            className="h-11 w-full justify-center rounded-xl px-0 font-normal text-slate-600"
            title="Paramètres"
          >
            <Settings className="h-5 w-5" />
          </Button>
        )}

        <Button
          variant="ghost"
          onClick={handleSignOut}
          className={`w-full ${isCollapsed ? 'justify-center px-0' : 'justify-start'} h-11 rounded-xl font-normal text-red-600 hover:text-red-700 hover:bg-red-50`}
          title={isCollapsed ? 'Déconnexion' : undefined}
        >
          <LogOut className={`h-5 w-5 ${!isCollapsed ? 'mr-3' : ''}`} />
          {!isCollapsed && 'Déconnexion'}
        </Button>
      </div>
    </aside>
  );
}
