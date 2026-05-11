import type { ReactNode } from 'react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  type PlaylistEmptyGhostLayout,
  usePlaylistEmptyGhostLayout,
} from '@/components/playlist-editor/usePlaylistEmptyGhostLayout';

export type { PlaylistEmptyGhostLayout };

type GhostTier = 'adjacent' | 'distant';

function GhostPlaylistRow({
  tier = 'distant',
  className,
}: {
  tier?: GhostTier;
  className?: string;
}) {
  /** Le layout playlist est en `bg-slate-50`; le panneau fantôme utilise `slate-100` (un niveau plus soutenu). */
  const shell = 'bg-slate-100';
  /** Tous les blocs internes partagent la même teinte. */
  const fill = 'bg-slate-200';

  const scale =
    tier === 'distant' ? 'origin-center sm:scale-[0.974]' : 'origin-center sm:scale-[0.985]';

  return (
    <div
      className={cn(
        'pointer-events-none select-none rounded-xl p-4',
        'shadow-none',
        shell,
        scale,
        className
      )}
      aria-hidden
    >
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
        <div className="flex shrink-0 items-center gap-0.5">
          <div className={cn('inline-block h-4 min-w-[0.875rem] rounded', fill)} />
          <div className={cn('h-8 w-8 rounded-md', fill)} />
        </div>

        <div
          className={cn(
            'h-20 w-32 shrink-0 overflow-hidden rounded-lg animate-pulse motion-reduce:animate-none',
            fill
          )}
        />

        <div className="min-w-0 flex-1 space-y-2.5 pt-1">
          <div className={cn('h-3.5 w-[58%] max-w-[200px] rounded-md', fill)} />
          <div className={cn('h-2.5 w-[36%] max-w-[100px] rounded', fill)} />
        </div>

        <div className={cn('h-3.5 w-12 shrink-0 rounded', fill)} />

        <div className="ml-1 flex shrink-0 gap-1 border-l border-slate-200 pl-2 sm:gap-1.5 sm:pl-3">
          <div className={cn('h-8 w-8 rounded-lg', fill)} />
          <div className={cn('h-8 w-8 rounded-lg', fill)} />
        </div>
      </div>
    </div>
  );
}

export type PlaylistEmptyTimelineChildRender = (ctx: {
  layout: PlaylistEmptyGhostLayout;
}) => ReactNode;

interface PlaylistEmptyTimelinePreviewProps {
  children: ReactNode | PlaylistEmptyTimelineChildRender;
}

/**
 * Cartes fantômes sur fond `slate-100`. Densité pilotée par la hauteur du `main` :
 * 4 lignes, 2 lignes (une au-dessus / une en dessous du CTA), ou aucune — le CTA reste prioritaire.
 *
 * Passez une fonction `children` pour adapter le CTA (ex. mode `compact` quand `layout === 'minimal'`).
 */
export function PlaylistEmptyTimelinePreview({ children }: PlaylistEmptyTimelinePreviewProps) {
  const [rootEl, setRootEl] = useState<HTMLDivElement | null>(null);
  const layout = usePlaylistEmptyGhostLayout(rootEl);

  const renderedChildren =
    typeof children === 'function' ? children({ layout }) : children;

  const showRails = layout !== 'minimal';

  return (
    <div ref={setRootEl} className="relative w-full min-h-0">
      {showRails ? (
        <div
          className="pointer-events-none absolute bottom-10 left-[1.125rem] top-10 hidden w-px bg-gradient-to-b from-transparent via-slate-200/30 to-transparent sm:block"
          aria-hidden
        />
      ) : null}

      <div className="relative flex min-h-0 flex-col gap-3.5 sm:gap-4">
        {layout === 'full' ? (
          <>
            <GhostPlaylistRow tier="distant" />
            <GhostPlaylistRow tier="adjacent" />
          </>
        ) : null}

        {layout === 'compact' ? <GhostPlaylistRow tier="adjacent" /> : null}

        <div className="relative z-[1] min-h-0 shrink-0 py-1">{renderedChildren}</div>

        {layout === 'compact' ? <GhostPlaylistRow tier="adjacent" /> : null}

        {layout === 'full' ? (
          <>
            <GhostPlaylistRow tier="adjacent" />
            <GhostPlaylistRow tier="distant" />
          </>
        ) : null}
      </div>
    </div>
  );
}
