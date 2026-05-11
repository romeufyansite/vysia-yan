import { useEffect, useState, useCallback } from 'react';
import { X, Play, Pause, Maximize } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { playlistService } from '@/services/playlist.service';
import { OverlayFrame } from '@/components/overlays/OverlayFrame';
import type { Screen, Playlist, PlaylistItem, Zone, ZoneTemplate } from '@/types';
import { isKnownOverlayType } from '@/types';

interface ScreenPreviewModalProps {
  screen: Screen;
  playlists: Playlist[];
  open: boolean;
  onClose: () => void;
}

const TEMPLATE_LAYOUTS: Record<ZoneTemplate, { zones: number; className: string }> = {
  fullscreen: { zones: 1, className: 'grid-cols-1' },
  '70-30': { zones: 2, className: 'grid-cols-[70%_30%]' },
  '30-70': { zones: 2, className: 'grid-cols-[30%_70%]' },
  banner: { zones: 2, className: 'grid-rows-[80%_20%]' },
};

function ZonePlayer({ zone, isPlaying }: { zone: Zone | undefined; isPlaying: boolean }) {
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const itemsFingerprint = `${zone?.playlist_id ?? ''}:${items.map((i) => i.id).join(',')}`;

  useEffect(() => {
    const loadItems = async () => {
      if (!zone?.playlist_id) {
        setItems([]);
        setLoading(false);
        return;
      }
      try {
        const playlistItems = await playlistService.getItems(zone.playlist_id);
        setItems(playlistItems);
      } catch (error) {
        console.error('Error loading playlist items:', error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    loadItems();
  }, [zone?.playlist_id]);

  useEffect(() => {
    setCurrentItemIndex(0);
  }, [itemsFingerprint]);

  useEffect(() => {
    if (!isPlaying || items.length === 0) return;
    const currentItem = items[currentItemIndex % items.length];
    if (!currentItem) return;
    const durationMs = (currentItem.duration || 5) * 1000;
    const len = items.length;
    const timer = window.setTimeout(() => {
      setCurrentItemIndex((prev) => {
        if (len <= 1) return 0;
        return (prev + 1) % len;
      });
    }, durationMs);
    return () => window.clearTimeout(timer);
  }, [isPlaying, itemsFingerprint, currentItemIndex, items.length]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white/40" />
      </div>
    );
  }

  if (items.length === 0 || !zone?.playlist_id) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-white/50">
        <span className="text-sm">Aucun contenu</span>
      </div>
    );
  }

  const currentItem = items[currentItemIndex];
  if (!currentItem) return null;

  const { app_type, config } = currentItem;

  if (app_type === 'image' && config?.imageUrl) {
    return (
      <img
        src={config.imageUrl}
        alt=""
        className="w-full h-full object-cover"
      />
    );
  }

  if (app_type === 'video' && (config?.videoUrl || config?.url)) {
    return (
      <video
        src={config.videoUrl || config.url}
        autoPlay={isPlaying}
        muted
        loop
        playsInline
        className="w-full h-full object-cover"
      />
    );
  }

  if (app_type === 'website' && (config?.websiteUrl || config?.url)) {
    return (
      <iframe
        src={config.websiteUrl || config.url}
        className="w-full h-full border-0"
        title="Website content"
      />
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white/50">
      <span className="text-sm">Type non supporté</span>
    </div>
  );
}

export function ScreenPreviewModal({ screen, open, onClose }: ScreenPreviewModalProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const template = screen.template || 'fullscreen';
  const layout = TEMPLATE_LAYOUTS[template];
  const orientation = screen.orientation || 'landscape';
  const zones = screen.zones || [];
  const overlays = screen.overlays || [];

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const aspectRatio = orientation === 'portrait' ? '9/16' : '16/9';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className={`p-0 gap-0 bg-black border-slate-800 overflow-hidden ${
          isFullscreen ? 'max-w-none w-screen h-screen rounded-none' : 'max-w-6xl w-[95vw] rounded-2xl'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-black/80 backdrop-blur-sm border-b border-white/10 z-10">
          <div className="flex items-center gap-3">
            <span className="text-white font-semibold text-sm">{screen.name}</span>
            <span className="text-white/40 text-xs">
              {orientation === 'portrait' ? 'Portrait' : 'Paysage'} • {template}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsPlaying((p) => !p)}
              className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10 rounded-lg"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10 rounded-lg"
            >
              <Maximize className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10 rounded-lg"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Screen Preview */}
        <div
          className="relative bg-black flex items-center justify-center p-4"
          style={{
            aspectRatio: isFullscreen ? undefined : aspectRatio,
            maxHeight: isFullscreen ? 'calc(100vh - 60px)' : '70vh',
          }}
        >
          <div
            className="relative w-full h-full bg-slate-900 rounded-lg overflow-hidden shadow-2xl"
            style={{ aspectRatio }}
          >
            {/* Zones Grid */}
            <div
              className={`h-full w-full ${
                template === 'banner' ? 'grid grid-rows-[80%_20%]' : 'grid'
              } ${layout.className} gap-0`}
            >
              {Array.from({ length: layout.zones }).map((_, index) => (
                <div key={index} className="relative overflow-hidden">
                  <ZonePlayer zone={zones[index]} isPlaying={isPlaying} />
                </div>
              ))}
            </div>

            <div className="pointer-events-none absolute inset-0 z-20">
              {overlays
                .filter((o) => o.enabled && isKnownOverlayType(o.type))
                .map((overlay, index) => (
                  <OverlayFrame key={overlay.id} overlay={overlay} zIndex={35 + index} />
                ))}
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="px-5 py-3 bg-black/80 backdrop-blur-sm border-t border-white/10">
          <div className="flex items-center justify-between text-xs text-white/50">
            <div className="flex items-center gap-4">
              <span>
                {zones.filter((z) => z.playlist_id).length} / {layout.zones} zone(s) active(s)
              </span>
              <span>
                {overlays.filter((o) => o.enabled && isKnownOverlayType(o.type)).length} overlay(s)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span>Lecture {isPlaying ? 'en cours' : 'pause'}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
