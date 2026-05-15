/** Délai minimum d’affichage des placeholders grille (cartes écrans / playlists). */
export const CARD_GRID_SKELETON_MIN_MS = 650;

/**
 * Résout `promise` en garantissant qu’au moins `minMs` se sont écoulées depuis l’appel.
 * À `minMs <= 0`, se comporte comme un passage direct sans attente additionnelle.
 */
export async function withMinimumElapsed<T>(promise: Promise<T>, minMs: number): Promise<T> {
  if (minMs <= 0) {
    return promise;
  }

  const started = Date.now();
  try {
    return await promise;
  } finally {
    const elapsed = Date.now() - started;
    const remaining = Math.max(0, minMs - elapsed);
    if (remaining > 0) {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, remaining);
      });
    }
  }
}
