import { Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface AddPlaylistCardProps {
  onClick: () => void;
}

export function AddPlaylistCard({ onClick }: AddPlaylistCardProps) {
  return (
    <Card
      onClick={onClick}
      className="group cursor-pointer overflow-hidden rounded-2xl border-0 bg-slate-100 shadow-none ring-0 transition-colors hover:bg-slate-200/35"
    >
      <CardContent className="p-0">
        <div className="px-1.5 pb-0 pt-2">
          <div className="mb-1.5 flex items-start justify-between">
            <div className="h-6 max-w-[76%]" aria-hidden />
          </div>

          <div className="relative mt-1 aspect-video w-full overflow-hidden rounded-lg">
            <div className="absolute inset-0 flex items-center justify-center px-px py-0">
              <div className="flex flex-col items-center justify-center gap-0 transition-[gap] duration-300 ease-out group-hover:gap-2">
                <Plus
                  className="h-20 w-20 shrink-0 text-slate-300 transition-transform duration-300 group-hover:scale-110 group-hover:text-slate-500"
                  strokeWidth={1.25}
                />
                <span className="max-h-0 overflow-hidden text-center opacity-0 transition-all duration-300 ease-out group-hover:max-h-16 group-hover:opacity-100">
                  <span className="inline-block rounded-lg bg-slate-200/70 px-3 py-1 text-sm font-medium text-slate-700 whitespace-nowrap">
                    Ajouter une playlist
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
