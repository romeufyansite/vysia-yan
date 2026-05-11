import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddPlaylistTimelineCardProps {
  onClick: () => void;
  compact?: boolean;
  label?: string;
}

export function AddPlaylistTimelineCard({
  onClick,
  compact,
  label = 'Ajouter un premier contenu à votre playlist',
}: AddPlaylistTimelineCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group w-full rounded-2xl border-2 border-dashed border-slate-200 bg-white text-left outline-none transition-all',
        'hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-md',
        'focus-visible:border-slate-400 focus-visible:ring-2 focus-visible:ring-slate-400/20',
        compact ? 'flex min-h-[72px] items-center justify-center gap-3 px-4 py-3' : 'min-h-[120px]'
      )}
    >
      {compact ? (
        <>
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 shadow-inner ring-1 ring-slate-200/80 transition-transform group-hover:scale-105 group-hover:from-slate-100 group-hover:to-slate-50 group-hover:ring-slate-200">
            <Plus className="h-5 w-5 text-slate-600 transition-colors group-hover:text-slate-900" strokeWidth={2} />
          </span>
          <span className="text-sm font-medium text-slate-600 transition-colors group-hover:text-slate-900">
            {label}
          </span>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 px-6 py-10">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-white shadow-inner ring-1 ring-slate-200/70 transition-all duration-300 group-hover:scale-[1.04] group-hover:from-slate-100 group-hover:to-white group-hover:shadow-md group-hover:ring-slate-200/85">
            <Plus className="h-8 w-8 text-slate-500 transition-colors group-hover:text-slate-800" strokeWidth={1.5} />
          </span>
          <div className="text-center space-y-1">
            <p className="text-base font-medium text-slate-800">{label}</p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Laissez-vous guider par notre assistant IA, ou opter pour une création de notre catalogue de contenu ou intégrer une application tierce à votre playlist.
              </p>
          </div>
        </div>
      )}
    </button>
  );
}
