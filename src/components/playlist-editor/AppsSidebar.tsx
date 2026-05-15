import { Search, ChevronDown, Image as ImageIcon, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface AppsSidebarProps {
  onAddImageApp: () => void;
  onClose?: () => void;
}

export function AppsSidebar({ onAddImageApp, onClose }: AppsSidebarProps) {
  return (
    <aside className="flex h-full min-h-0 w-full shrink-0 flex-col border-t border-slate-200 bg-white shadow-sm lg:w-[380px] lg:border-l lg:border-t-0 xl:w-[420px]">
      <div className="p-4">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-medium tracking-tight text-slate-900">Bibliothèque d&apos;apps</h2>
          {onClose && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 w-9 shrink-0 rounded-full text-slate-500 hover:text-slate-900"
              aria-label="Fermer la bibliothèque"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Rechercher..."
              className="h-10 min-h-10 pl-9"
            />
          </div>
          <Button variant="outline" size="sm" className="h-10">
            Populaire
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-auto p-4">
        <div className="space-y-3">
          <button
            onClick={onAddImageApp}
            className="w-full flex items-center gap-4 p-4 rounded-lg border border-slate-200/80 text-left transition-colors hover:bg-slate-50"
          >
            <div className="w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0">
              <ImageIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Image</h3>
              <p className="text-sm text-gray-500">Media</p>
            </div>
          </button>

          <div className="pt-4 pb-2">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
              Prochainement
            </div>
          </div>

          <div className="space-y-3 opacity-50 pointer-events-none">
            <div className="w-full flex items-center gap-4 p-4 rounded-lg border border-slate-200/80">
              <div className="w-12 h-12 rounded-full bg-cyan-400 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-lg">&lt;/&gt;</span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Embed</h3>
                <p className="text-sm text-gray-500">Media</p>
              </div>
            </div>

            <div className="w-full flex items-center gap-4 p-4 rounded-lg border border-slate-200/80">
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-xl">f</span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Facebook Page</h3>
                <p className="text-sm text-gray-500">Social</p>
              </div>
            </div>

            <div className="w-full flex items-center gap-4 p-4 rounded-lg border border-slate-200/80">
              <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-xl">G</span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">GDrive Slideshow</h3>
                <p className="text-sm text-gray-500">Media</p>
              </div>
            </div>

            <div className="w-full flex items-center gap-4 p-4 rounded-lg border border-slate-200/80">
              <div className="w-12 h-12 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0">
                <ImageIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Image Slideshow</h3>
                <p className="text-sm text-gray-500">Media</p>
              </div>
            </div>

            <div className="w-full flex items-center gap-4 p-4 rounded-lg border border-slate-200/80">
              <div className="w-12 h-12 rounded-full bg-pink-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-xl">📷</span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Instagram Account</h3>
                <p className="text-sm text-gray-500">Social</p>
              </div>
            </div>

            <div className="w-full flex items-center gap-4 p-4 rounded-lg border border-slate-200/80">
              <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-xl">?</span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Quiz</h3>
                <p className="text-sm text-gray-500">Game</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
