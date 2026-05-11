import { useEffect, useRef, useState } from 'react';
import { deviceStorage } from '@/lib/device-storage';
import { Monitor, Maximize } from 'lucide-react';
import { OverlayFrame } from '@/components/overlays/OverlayFrame';
import type { Overlay, ScreenOrientation, ZoneTemplate } from '@/types';
import { isKnownOverlayType } from '@/types';

const BASE_LANDSCAPE = { width: 1280, height: 720 };
const BASE_PORTRAIT = { width: 720, height: 1280 };

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface PlaylistItem {
  id: string;
  app_type: string;
  config: {
    imageUrl?: string;
    videoUrl?: string;
    url?: string;
    websiteUrl?: string;
  };
  duration: number;
  order_index: number;
}

interface ScreenConfig {
  id: string;
  name: string;
  status: string;
  orientation?: ScreenOrientation;
  template?: ZoneTemplate;
  zones?: unknown[];
  overlays?: Overlay[];
}

interface ZoneFeed {
  playlist: { id?: string; transition_speed?: string } | null;
  items: PlaylistItem[];
  hasContent: boolean;
}

interface SceneData {
  message: string;
  version: number;
  screen: ScreenConfig | null;
  playlist: { transition_speed?: string } | null;
  items: PlaylistItem[];
  /** Slots de lecture par zone (alignés sur le template côté serveur) */
  zoneFeeds?: ZoneFeed[];
  hasContent: boolean;
  isOffline?: boolean;
}

const TEMPLATE_CLASS: Record<NonNullable<ScreenConfig['template']>, string> = {
  fullscreen: 'grid-cols-1',
  '70-30': 'grid-cols-[70%_30%]',
  '30-70': 'grid-cols-[30%_70%]',
  banner: 'grid-rows-[80%_20%]',
};

function getTransitionClassForPlaylist(playlist: { transition_speed?: string } | null | undefined) {
  const speed = playlist?.transition_speed;
  switch (speed) {
    case 'slow':
      return 'transition-opacity duration-[2000ms]';
    case 'medium':
      return 'transition-opacity duration-1000';
    case 'fast':
      return 'transition-opacity duration-500';
    default:
      return '';
  }
}

function ZonePlaylistPlayer({
  feed,
  renderPlaylistItem,
}: {
  feed: ZoneFeed;
  renderPlaylistItem: (item: PlaylistItem, playlist: ZoneFeed['playlist']) => React.ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const items = feed.items || [];
  const fingerprint = `${feed.playlist?.id ?? ''}:${(feed.items ?? []).map((i) => i.id).join(',')}`;

  useEffect(() => {
    setIndex(0);
  }, [fingerprint]);

  useEffect(() => {
    const list = feed.items || [];
    if (!feed.hasContent || list.length === 0) return;
    const current = list[index % list.length];
    if (!current) return;
    const duration = (current.duration || 5) * 1000;
    const len = list.length;
    const t = window.setTimeout(() => {
      setIndex((prev) => {
        if (len <= 1) return 0;
        return (prev + 1) % len;
      });
    }, duration);
    return () => window.clearTimeout(t);
  }, [feed.hasContent, fingerprint, index]);

  if (!feed.hasContent || items.length === 0) {
    return (
      <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center text-white/40 p-6 text-center">
        <Monitor className="h-10 w-10 mb-2 opacity-40" />
        <span className="text-sm">Aucune playlist sur cette zone</span>
      </div>
    );
  }

  const item = items[index];
  return <>{renderPlaylistItem(item, feed.playlist)}</>;
}

export function PlayerRunPage() {
  const [sceneData, setSceneData] = useState<SceneData | null>(null);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const stageWrapperRef = useRef<HTMLDivElement>(null);
  const [stageScale, setStageScale] = useState(1);

  useEffect(() => {
    if (!deviceStorage.isDeviceConnected()) {
      window.location.hash = '/player';
      return;
    }

    const fetchScene = async () => {
      const deviceJwt = deviceStorage.getDeviceJwt();
      if (!deviceJwt) return;

      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/scene-get`, {
          headers: { Authorization: `Bearer ${deviceJwt}` },
        });

        if (response.status === 404) {
          deviceStorage.clearAll();
          window.location.hash = '/player';
          return;
        }

        if (response.status === 401) {
          deviceStorage.clearAll();
          window.location.hash = '/player';
          return;
        }

        if (response.ok) {
          const data = await response.json();
          setSceneData(data);
        }
      } catch (error) {
        console.error('[PlayerRunPage] Failed to fetch scene:', error);
      }
    };

    fetchScene();
    const heartbeatInterval = setInterval(fetchScene, 30000);
    return () => clearInterval(heartbeatInterval);
  }, []);

  const template = sceneData?.screen?.template || 'fullscreen';
  const zoneFeeds = sceneData?.zoneFeeds;

  /** Layout 2 zones : plusieurs flux indépendants */
  const isMultiZonePlayback =
    (template === '70-30' || template === '30-70' || template === 'banner') &&
    !!(zoneFeeds && zoneFeeds.length >= 2);

  useEffect(() => {
    if (isMultiZonePlayback) return;

    const items =
      zoneFeeds?.[0]?.items?.length != null ? zoneFeeds[0].items : sceneData?.items ?? [];

    const hasPrimary =
      (zoneFeeds?.[0]?.hasContent ?? sceneData?.hasContent) && items.length > 0;

    if (!sceneData || sceneData.isOffline || !hasPrimary) return;

    const currentItem = items[currentItemIndex];
    if (!currentItem) return;

    const duration = (currentItem.duration || 5) * 1000;

    const timer = setTimeout(() => {
      setCurrentItemIndex((prev) => (prev + 1) % items.length);
    }, duration);

    return () => clearTimeout(timer);
  }, [sceneData, currentItemIndex, isMultiZonePlayback, zoneFeeds, template]);

  useEffect(() => {
    setCurrentItemIndex(0);
  }, [sceneData?.version, template, zoneFeeds?.length]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const orientation = sceneData?.screen?.orientation || 'landscape';
  const stageVisualW = orientation === 'portrait' ? BASE_PORTRAIT.height : BASE_LANDSCAPE.width;
  const stageVisualH = orientation === 'portrait' ? BASE_PORTRAIT.width : BASE_LANDSCAPE.height;

  useEffect(() => {
    const update = () => {
      const el = stageWrapperRef.current;
      if (!el) return;
      const next = Math.min(el.clientWidth / stageVisualW, el.clientHeight / stageVisualH);
      setStageScale(Number.isFinite(next) && next > 0 ? next : 1);
    };

    update();
    const el = stageWrapperRef.current;
    const observer = el ? new ResizeObserver(update) : null;
    if (el) observer?.observe(el);
    window.addEventListener('resize', update);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [stageVisualW, stageVisualH, sceneData?.screen?.id]);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else if (document.exitFullscreen) {
      await document.exitFullscreen();
    }
  };

  const renderPlaylistItem = (
    item: PlaylistItem,
    playlist: ZoneFeed['playlist']
  ): React.ReactNode => {
    const transition = getTransitionClassForPlaylist(playlist);
    switch (item.app_type) {
      case 'image':
        return (
          <div className="w-full h-full bg-black">
            <img
              src={item.config.imageUrl}
              alt="Playlist content"
              className={`w-full h-full object-cover ${transition}`}
            />
          </div>
        );
      case 'video':
        return (
          <div className="w-full h-full bg-black">
            <video
              src={item.config.videoUrl || item.config.url}
              autoPlay
              muted
              loop
              className="w-full h-full object-cover"
            />
          </div>
        );
      case 'website':
        return (
          <iframe
            src={item.config.websiteUrl || item.config.url}
            className="w-full h-full border-0"
            title="Website content"
          />
        );
      default:
        return (
          <div className="w-full h-full flex items-center justify-center bg-black text-white">
            <p>Type non supporté: {item.app_type}</p>
          </div>
        );
    }
  };

  if (!sceneData) {
    return (
      <div className="h-screen bg-black flex items-center justify-center overflow-hidden">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  const screen = sceneData.screen;
  const screenName = screen?.name || 'Écran connecté';

  const stageBase = orientation === 'portrait' ? BASE_PORTRAIT : BASE_LANDSCAPE;
  const stageTransform =
    orientation === 'portrait'
      ? `rotate(-90deg) scale(${stageScale})`
      : `scale(${stageScale})`;

  if (sceneData.isOffline) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center p-8 overflow-hidden">
        <div className="flex flex-col items-center gap-6 max-w-2xl text-center">
          <Monitor className="h-24 w-24 text-red-500/30" />
          <h1 className="text-white text-4xl">{screen?.name || 'Écran'}</h1>
          <p className="text-red-400 text-xl font-medium">{sceneData.message}</p>
          <div className="mt-8 flex items-center gap-2 text-gray-500 text-sm">
            <div className="h-2 w-2 bg-red-500 rounded-full" />
            Hors ligne (v{sceneData.version})
          </div>
        </div>
        <button
          onClick={toggleFullscreen}
          className="absolute bottom-4 right-4 bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg backdrop-blur-sm transition-colors"
          title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
        >
          <Maximize className="h-5 w-5" />
        </button>
      </div>
    );
  }

  const singleItems =
    zoneFeeds?.[0]?.items?.length != null ? zoneFeeds[0].items : sceneData.items ?? [];
  const singleHasPrimary =
    (zoneFeeds?.[0]?.hasContent ?? sceneData.hasContent) && singleItems.length > 0;
  const primaryPlaylist = zoneFeeds?.[0]?.playlist ?? sceneData.playlist;
  const currentSingleItem =
    singleHasPrimary && singleItems[currentItemIndex] ? singleItems[currentItemIndex] : null;

  const renderScene = () => {
    const emptyPlaceholder = (
      <div className="w-full h-full bg-black flex flex-col items-center justify-center text-white/70 p-8 text-center">
        <Monitor className="h-16 w-16 mb-4 text-white/20" />
        <h2 className="text-2xl mb-2">{screenName}</h2>
        <p className="text-sm text-gray-400">{sceneData.message}</p>
      </div>
    );

    if (isMultiZonePlayback && zoneFeeds) {
      const isGridRows = template === 'banner';
      const zoneCount =
        template === 'banner' || template === '70-30' || template === '30-70' ? 2 : 1;
      return (
        <div
          className={`w-full h-full ${isGridRows ? 'grid grid-rows-[80%_20%]' : 'grid'} ${TEMPLATE_CLASS[template]}`}
        >
          {Array.from({ length: zoneCount }).map((_, idx) => (
            <div key={idx} className="relative overflow-hidden bg-black">
              <ZonePlaylistPlayer
                feed={zoneFeeds[idx] ?? { playlist: null, items: [], hasContent: false }}
                renderPlaylistItem={renderPlaylistItem}
              />
            </div>
          ))}
        </div>
      );
    }

    const itemContent =
      currentSingleItem != null ? renderPlaylistItem(currentSingleItem, primaryPlaylist) : null;
    return itemContent || emptyPlaceholder;
  };

  return (
    <div
      ref={stageWrapperRef}
      className="h-screen w-full bg-black overflow-hidden fixed inset-0 flex items-center justify-center"
    >
      <div
        className="relative"
        style={{
          width: stageBase.width,
          height: stageBase.height,
          transform: stageTransform,
          transformOrigin: 'center center',
        }}
      >
        {renderScene()}
        {(screen?.overlays ?? [])
          .filter((o) => o.enabled && isKnownOverlayType(o.type))
          .map((overlay, index) => (
            <OverlayFrame key={overlay.id} overlay={overlay} zIndex={40 + index} />
          ))}
      </div>

      <button
        onClick={toggleFullscreen}
        className="absolute bottom-4 right-4 z-50 bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg backdrop-blur-sm transition-colors"
        title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
      >
        <Maximize className="h-5 w-5" />
      </button>
    </div>
  );
}
