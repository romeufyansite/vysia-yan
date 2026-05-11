import { ReactNode, useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sidebar } from './Sidebar';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile && isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, isSidebarOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100/90">
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={setIsSidebarOpen}
        onNavigate={() => isMobile && setIsSidebarOpen(false)}
      />

      <main className="flex-1 overflow-auto bg-gradient-to-b from-slate-50/95 via-white to-white">
        {isMobile && (
          <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-md lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(true)}
              className="h-10 w-10 shrink-0 rounded-xl text-slate-700 hover:bg-slate-100"
            >
              <Menu className="h-5 w-5 text-gray-700" />
            </Button>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs">
              V
            </div>
            <span className="font-bold text-slate-800">Vysia</span>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
