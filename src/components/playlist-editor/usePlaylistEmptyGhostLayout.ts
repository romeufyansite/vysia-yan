import { useLayoutEffect, useState } from 'react';

export type PlaylistEmptyGhostLayout = 'full' | 'compact' | 'minimal';

/** Hauteur estimée d’une carte fantôme (~ p-4 + ligne à h-20). */
const GHOST_ROW_APPROX_PX = 108;
/** Espacement vertical entre lignes (~ gap-3.5 / gap-4). */
const STACK_GAP_APPROX_PX = 14;
/** Bloc du CTA non compact (min-h + texte + paddings). */
const CTA_BLOCK_APPROX_PX = 280;
/** Marge pour `py-1`, rail timeline et léger jeu de sécurité. */
const STACK_BUFFER_PX = 40;

function fullStackApproxPx(): number {
  const rows = 4;
  const gaps = 4;
  return (
    rows * GHOST_ROW_APPROX_PX + gaps * STACK_GAP_APPROX_PX + CTA_BLOCK_APPROX_PX + STACK_BUFFER_PX
  );
}

function compactStackApproxPx(): number {
  const rows = 2;
  const gaps = 2;
  return (
    rows * GHOST_ROW_APPROX_PX + gaps * STACK_GAP_APPROX_PX + CTA_BLOCK_APPROX_PX + STACK_BUFFER_PX
  );
}

function resolveLayout(usableMainHeightPx: number): PlaylistEmptyGhostLayout {
  const fullThreshold = fullStackApproxPx();
  const compactThreshold = compactStackApproxPx();
  if (usableMainHeightPx >= fullThreshold) return 'full';
  if (usableMainHeightPx >= compactThreshold) return 'compact';
  return 'minimal';
}

/**
 * Déduit si le squelette doit afficher 4, 2 ou 0 cartes fantômes pour garder le CTA lisible
 * dans la colonne principale de l’éditeur (`main` scrollable).
 */
export function usePlaylistEmptyGhostLayout(rootEl: HTMLElement | null): PlaylistEmptyGhostLayout {
  const [layout, setLayout] = useState<PlaylistEmptyGhostLayout>('compact');

  useLayoutEffect(() => {
    if (!rootEl) return;

    const mainEl = rootEl.closest('main');
    if (!mainEl) {
      setLayout('full');
      return;
    }

    const update = () => {
      const usable = mainEl.clientHeight;
      setLayout(resolveLayout(usable));
    };

    update();

    const ro = new ResizeObserver(() => {
      update();
    });
    ro.observe(mainEl);
    window.addEventListener('resize', update);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [rootEl]);

  return layout;
}
