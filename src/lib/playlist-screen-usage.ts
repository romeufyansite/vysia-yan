import type { Zone } from '@/types';

export type ScreenPlaylistUsageRow = {
  id: string;
  name: string;
  playlist_id: string | null;
  zones: Zone[] | null;
};

/** Regroupe les écrans par id de playlist.
 * Si `zones` est non vide, seules les affectations dans les zones comptent :
 * une `playlist_id` résiduelle sans zone remplie est ignorée (voir bug dérive écran). */
export function buildPlaylistToScreensMap(
  rows: ScreenPlaylistUsageRow[]
): Record<string, { id: string; name: string }[]> {
  const map: Record<string, { id: string; name: string }[]> = {};

  for (const s of rows) {
    const playlistIds = new Set<string>();
    const zones = s.zones ?? [];

    if (zones.length === 0) {
      if (s.playlist_id) playlistIds.add(s.playlist_id);
    } else {
      for (const z of zones) {
        const pid = z?.playlist_id;
        if (pid) playlistIds.add(pid);
      }
    }
    for (const pid of playlistIds) {
      if (!map[pid]) map[pid] = [];
      if (!map[pid].some((x) => x.id === s.id)) {
        map[pid].push({ id: s.id, name: s.name });
      }
    }
  }

  for (const key of Object.keys(map)) {
    map[key].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }

  return map;
}
