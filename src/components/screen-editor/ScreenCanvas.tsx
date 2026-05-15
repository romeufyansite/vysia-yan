import { useEffect, useRef, useState } from 'react';
import { Plus, Image as ImageIcon, Film, Images, Clapperboard, ListMusic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { playlistService } from '@/services/playlist.service';
import { playlistGroupService } from '@/services/playlist-group.service';
import { PlaylistSelectorModal } from './PlaylistSelectorModal';
import type {
  Zone,
  ZoneTemplate,
  ScreenOrientation,
  Playlist,
  PlaylistItem,
  PlaylistGroup,
  Overlay,
} from '@/types';
import { isKnownOverlayType } from '@/types';
import { OverlayFrame } from '@/components/overlays/OverlayFrame';

interface ScreenCanvasProps {
  template: ZoneTemplate;
  orientation: ScreenOrientation;
  zones: Zone[];
  playlists: Playlist[];
  overlays?: Overlay[];
  onOverlayPositionChange?: (id: string, x: number, y: number) => void;
  onAssignPlaylist?: (zoneIndex: number, playlistId: string | null) => void;
  onAddPlaylist?: () => void;
}

const TEMPLATE_LAYOUTS: Record<ZoneTemplate, { zones: number; className: string }> = {
  fullscreen: { zones: 1, className: 'grid-cols-1' },
  '70-30': { zones: 2, className: 'grid-cols-[70%_30%]' },
  '30-70': { zones: 2, className: 'grid-cols-[30%_70%]' },
  banner: { zones: 2, className: 'grid-rows-[80%_20%]' },
};

const BASE_LANDSCAPE = { width: 1280, height: 720 };
const BASE_PORTRAIT = { width: 720, height: 1280 };

export function ScreenCanvas({
  template,
  orientation,
  zones,
  playlists,
  overlays = [],
  onOverlayPositionChange,
  onAssignPlaylist,
  onAddPlaylist,
}: ScreenCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [playlistGroups, setPlaylistGroups] = useState<PlaylistGroup[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeZoneIndex, setActiveZoneIndex] = useState<number | null>(null);
  const [activeZoneLabel, setActiveZoneLabel] = useState<string>('');

  const layout = TEMPLATE_LAYOUTS[template];
  const base = orientation === 'portrait' ? BASE_PORTRAIT : BASE_LANDSCAPE;
  const screenOrientation = orientation || 'landscape';
  const enabledOverlays = overlays.filter((o) => o.enabled && isKnownOverlayType(o.type));
  const compatiblePlaylists = playlists.filter(
    (p) => (p.orientation || 'landscape') === screenOrientation
  );

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const groups = await playlistGroupService.getAll();
        setPlaylistGroups(groups);
      } catch {
        setPlaylistGroups([]);
      }
    };
    fetchGroups();
  }, []);

  const handleOpenModal = (zoneIndex: number, zoneLabel: string) => {
    setActiveZoneIndex(zoneIndex);
    setActiveZoneLabel(zoneLabel);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setActiveZoneIndex(null);
    setActiveZoneLabel('');
  };

  const handleSelectPlaylist = (playlistId: string | null) => {
    if (activeZoneIndex !== null && onAssignPlaylist) {
      onAssignPlaylist(activeZoneIndex, playlistId);
    }
  };

  useEffect(() => {
    const updateScale = () => {
      const el = containerRef.current;
      if (!el) return;
      const padding = 48;
      const availableW = el.clientWidth - padding;
      const availableH = el.clientHeight - padding;
      const scaleX = availableW / base.width;
      const scaleY = availableH / base.height;
      setScale(Math.min(scaleX, scaleY, 1));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener('resize', updateScale);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [base.width, base.height]);

  return (
    <>
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center p-6 lg:p-8 bg-slate-100 min-h-0 overflow-hidden"
      >
        <div
          ref={stageRef}
          className="relative bg-slate-900 rounded-2xl shadow-2xl ring-1 ring-slate-900/10 transition-[width,height] duration-300 ease-out"
          style={{
            width: base.width * scale,
            height: base.height * scale,
          }}
        >
          <div className="absolute inset-0 overflow-hidden rounded-2xl">
            <div
              className={`h-full w-full ${
                template === 'banner' ? 'grid grid-rows-[80%_20%]' : 'grid'
              } ${layout.className} gap-0`}
            >
              {Array.from({ length: layout.zones }).map((_, index) => {
                const zone = zones[index];
                const zoneLabel = `Zone ${String.fromCharCode(65 + index)}`;
                return (
                  <ZoneSlot
                    key={`${zone?.id ?? 'empty'}-${index}`}
                    zone={zone}
                    zoneLabel={zoneLabel}
                    playlists={compatiblePlaylists}
                    canAssign={typeof onAssignPlaylist === 'function'}
                    onOpenModal={() => handleOpenModal(index, zoneLabel)}
                  />
                );
              })}
            </div>
          </div>

          <div className="pointer-events-none absolute inset-0 z-20">
            {enabledOverlays.map((overlay, index) => (
              <OverlayFrame
                key={overlay.id}
                overlay={overlay}
                zIndex={31 + index}
                draggable={!!onOverlayPositionChange}
                stageRef={stageRef}
                onDragPosition={onOverlayPositionChange}
              />
            ))}
          </div>
        </div>
      </div>

      <PlaylistSelectorModal
        open={isModalOpen}
        onClose={handleCloseModal}
        zoneLabel={activeZoneLabel}
        playlists={compatiblePlaylists}
        playlistGroups={playlistGroups}
        onSelectPlaylist={handleSelectPlaylist}
        currentPlaylistId={activeZoneIndex !== null ? zones[activeZoneIndex]?.playlist_id : undefined}
        onAddPlaylist={onAddPlaylist}
      />
    </>
  );
}

function PlaylistBackground({ playlistId }: { playlistId: string }) {
  const [firstItem, setFirstItem] = useState<PlaylistItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    playlistService
      .getItems(playlistId)
      .then((items) => {
        if (!cancelled) {
          setFirstItem(items[0] || null);
        }
      })
      .catch(() => {
        if (!cancelled) setFirstItem(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [playlistId]);

  if (loading || !firstItem) return null;

  const { app_type, config } = firstItem;

  if (app_type === 'image' && config?.imageUrl) {
    return (
      <img
        src={config.imageUrl}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
    );
  }

  if (app_type === 'video' && (config?.videoUrl || config?.url)) {
    return (
      <video
        src={config.videoUrl || config.url}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />
    );
  }

  return null;
}

function ZoneSlot({
  zone,
  zoneLabel,
  playlists,
  canAssign,
  onOpenModal,
}: {
  zone: Zone | undefined;
  zoneLabel: string;
  playlists: Playlist[];
  canAssign: boolean;
  onOpenModal: () => void;
}) {
  const playlistId = zone?.playlist_id;
  const assigned = playlistId ? playlists.find((p) => p.id === playlistId) : null;

  if (playlistId && assigned) {
    return (
      <div className="relative flex flex-col items-center justify-center gap-2 border border-slate-800 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 px-4 py-6 text-white/95 text-center overflow-hidden">
        {/* Background preview of the first media in the playlist */}
        <div className="absolute inset-0 z-0">
          <PlaylistBackground playlistId={playlistId} />
          <div className="absolute inset-0 bg-slate-900/60" />
        </div>
        <ListMusic className="h-10 w-10 text-white/75 shrink-0 relative z-10" />
        <div className="text-xs font-medium uppercase tracking-wide text-white/45 relative z-10">{zoneLabel}</div>
        <div className="text-sm font-medium leading-tight line-clamp-2 relative z-10">{assigned.name}</div>
        {canAssign && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenModal}
            className="mt-1 rounded-lg bg-white/10 text-white hover:bg-white/20 border-0 relative z-10"
          >
            Modifier
          </Button>
        )}
      </div>
    );
  }

  /* Ancien schéma : zone remplie par type média uniquement */
  if (zone?.type) {
    const labels: Record<NonNullable<Zone['type']>, string> = {
      image: 'Image',
      video: 'Vidéo',
      'slideshow-image': 'Slideshow image',
      'slideshow-video': 'Slideshow vidéo',
    };
    const Icon =
      zone.type === 'image'
        ? ImageIcon
        : zone.type === 'video'
          ? Film
          : zone.type === 'slideshow-image'
            ? Images
            : Clapperboard;

    return (
      <div className="relative flex flex-col items-center justify-center border border-slate-800 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 text-white/90 px-4">
        <Icon className="h-12 w-12 mb-3 text-white/70" />
        <div className="text-xs text-white/45 mb-1">{zoneLabel}</div>
        <div className="text-sm font-medium">{labels[zone.type]}</div>
        <p className="text-[11px] text-amber-200/90 mt-2 text-center px-2">
          Assignez une playlist pour cette zone.
        </p>
        {canAssign && playlists.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenModal}
            className="mt-2 rounded-lg bg-white/10 text-white hover:bg-white/20 border-0"
          >
            Choisir playlist
          </Button>
        )}
      </div>
    );
  }

  /* Playlist liée mais absente du cache (liste) */
  if (playlistId && !assigned) {
    return (
      <div className="relative flex flex-col items-center justify-center gap-2 border border-amber-800/60 bg-slate-800 px-4 text-amber-100 text-center text-sm">
        <ListMusic className="h-8 w-8 opacity-70" />
        <span>{zoneLabel}</span>
        <span className="text-xs opacity-75">Playlist non trouvée dans la liste locale</span>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-center gap-3 border border-slate-800 bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900">
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenModal}
        disabled={!canAssign}
        className="h-16 w-16 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Plus className="h-8 w-8" />
      </Button>
      <span className="text-[10px] font-medium uppercase tracking-wide text-white/35">
        {zoneLabel}
      </span>
    </div>
  );
}
