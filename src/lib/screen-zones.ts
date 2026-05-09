import type { Screen, Zone, ZoneTemplate } from '@/types';

export interface ZoneDescriptor {
  key: string;
  label: string;
  share: string;
}

export function getExpectedZoneCount(template: ZoneTemplate | undefined): number {
  const t = template || 'fullscreen';
  if (t === '70-30' || t === '30-70' || t === 'banner') return 2;
  return 1;
}

export function getZoneDescriptors(template: ZoneTemplate | undefined): ZoneDescriptor[] {
  const t = template || 'fullscreen';
  switch (t) {
    case 'fullscreen':
      return [{ key: 'a', label: 'Zone A', share: '100 %' }];
    case '70-30':
      return [
        { key: 'a', label: 'Zone A', share: '70 %' },
        { key: 'b', label: 'Zone B', share: '30 %' },
      ];
    case '30-70':
      return [
        { key: 'a', label: 'Zone A', share: '30 %' },
        { key: 'b', label: 'Zone B', share: '70 %' },
      ];
    case 'banner':
      return [
        { key: 'a', label: 'Zone A', share: 'Contenu principal' },
        { key: 'b', label: 'Zone B', share: 'Bandeau · 20 %' },
      ];
    default:
      return [{ key: 'a', label: 'Zone A', share: '100 %' }];
  }
}

/** Colonne legacy `playlist_id` : reflète zone A si définie, sinon la valeur existante en base. */
export function deriveScreenPlaylistId(screen: Pick<Screen, 'template' | 'zones' | 'playlist_id'>): string | null {
  const first = screen.zones?.[0];
  const fromZone = first?.playlist_id ?? null;
  if (fromZone) return fromZone;
  return screen.playlist_id ?? null;
}

export function normalizeZoneAssignments(
  template: ZoneTemplate | undefined,
  zones: Zone[] | undefined,
  updater: { zoneIndex: number; playlistId: string | null }
): Zone[] {
  const count = getExpectedZoneCount(template);
  const next = [...(zones || [])];
  while (next.length < count) {
    next.push({
      id: `zone-slot-${next.length}-${Date.now()}`,
      playlist_id: null,
      position: { x: 0, y: 0, width: 100, height: 100 },
    } as Zone);
  }
  const prev = next[updater.zoneIndex];
  next[updater.zoneIndex] = {
    id: prev?.id ?? `zone-${Date.now()}-${updater.zoneIndex}`,
    playlist_id: updater.playlistId,
    position:
      prev?.position ?? ({ x: 0, y: 0, width: 100, height: 100 } satisfies Zone['position']),
  };
  return next.slice(0, count);
}
