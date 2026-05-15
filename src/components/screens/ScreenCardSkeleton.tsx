import { Card, CardContent } from '@/components/ui/card';

/** Placeholder discret ; la pulsation est appliquée par la grille parente `.skeleton-card-grid`. */
export function ScreenCardSkeleton() {
  return (
    <Card className="rounded-2xl border-0 bg-slate-100/55 shadow-none">
      <CardContent className="space-y-2 p-2 sm:space-y-2.5 sm:p-2.5">
        <div className="h-7 rounded-lg bg-slate-300/[0.16] sm:h-9 sm:rounded-xl" aria-hidden />
        <div className="aspect-video rounded-lg bg-slate-300/[0.12] sm:rounded-xl" aria-hidden />
      </CardContent>
    </Card>
  );
}
