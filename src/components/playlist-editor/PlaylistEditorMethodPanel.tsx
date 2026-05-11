import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PlaylistEditorMethodPanelProps {
  title: string;
  description: string;
  accentLabel?: string;
  onClose: () => void;
}

/** Panneau latéral lorsqu'une méthode d'ajout autres que les apps est choisie (placeholders jusqu'aux parcours complets). */
export function PlaylistEditorMethodPanel({
  title,
  description,
  accentLabel = 'Bientôt disponible',
  onClose,
}: PlaylistEditorMethodPanelProps) {
  return (
    <aside className="flex h-full min-h-0 w-full shrink-0 flex-col border-t border-slate-200 bg-white shadow-sm lg:w-[380px] lg:border-l lg:border-t-0 xl:w-[420px]">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5 lg:p-6">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">{accentLabel}</p>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 shrink-0 rounded-full text-slate-500 hover:text-slate-900"
          aria-label="Fermer ce panneau"
          onClick={onClose}
        >
          Fermer
        </Button>
      </div>
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-5 lg:p-6">
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-400 text-white shadow-md">
            <Sparkles className="h-7 w-7" aria-hidden strokeWidth={1.5} />
          </div>
          <p className="max-w-[280px] text-sm leading-relaxed text-slate-600">{description}</p>
        </div>
        <Button type="button" variant="outline" className="h-11 w-full rounded-xl border-slate-200" onClick={onClose}>
          Retour aux paramètres
        </Button>
      </div>
    </aside>
  );
}
