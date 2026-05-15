import { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Play, Pause, Maximize } from 'lucide-react';
import { playlistService } from '@/services/playlist.service';
import type { PlaylistItem } from '@/types';

interface PlaylistPreviewModalProps {
  open: boolean;
  playlistId: string;
  playlistName: string;
  orientation?: 'landscape' | 'portrait';
  onClose: () => void;
}

export function PlaylistPreviewModal({
  open,
  playlistId,
  playlistName,
  orientation = 'landscape',
  onClose,
}: PlaylistPreviewModalProps) {
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setCurrentIndex(0);
    setProgress(0);
    setPlaying(true);
    playlistService
      .getItems(playlistId)
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open, playlistId]);

  const goTo = useCallback(
    (index: number) => {
      setCurrentIndex(((index % items.length) + items.length) % items.length);
      setProgress(0);
    },
    [items.length]
  );

  // Auto-advance timer
  useEffect(() => {
    if (!playing || !items.length || loading) return;
    const item = items[currentIndex];
    const duration = (item?.duration || 5) * 1000;
    const tickMs = 100;
    let elapsed = progress * duration;

    const interval = setInterval(() => {
      elapsed += tickMs;
      const p = Math.min(elapsed / duration, 1);
      setProgress(p);
      if (p >= 1) {
        goTo(currentIndex + 1);
      }
    }, tickMs);

    return () => clearInterval(interval);
  }, [playing, items, currentIndex, loading, goTo]);

  const renderItem = (item: PlaylistItem) => {
    switch (item.app_type) {
      case 'image':
        return (
          <img
            key={item.id}
            src={item.config?.imageUrl}
            alt=""
            className="w-full h-full object-contain"
          />
        );
      case 'video':
        return (
          <video
            key={item.id}
            src={item.config?.videoUrl || item.config?.url}
            autoPlay
            muted
            loop
            className="w-full h-full object-contain"
          />
        );
      case 'website':
        return (
          <iframe
            key={item.id}
            src={item.config?.websiteUrl || item.config?.url}
            className="w-full h-full border-0"
            title="Website content"
          />
        );
      default:
        return (
          <div className="w-full h-full flex items-center justify-center text-white/50 text-sm">
            Type non supporté : {item.app_type}
          </div>
        );
    }
  };

  const currentItem = items[currentIndex];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className={`p-0 gap-0 bg-black border-slate-800 rounded-2xl overflow-hidden ${
          orientation === 'portrait' ? 'max-w-sm w-[95vw]' : 'max-w-5xl w-[95vw]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-black/80 backdrop-blur-sm border-b border-white/10 z-10">
          <div className="flex items-center gap-3">
            <span className="text-white font-medium text-sm truncate max-w-[200px]">
              {playlistName}
            </span>
            {items.length > 0 && (
              <span className="text-white/40 text-xs">
                {currentIndex + 1} / {items.length}
              </span>
            )}
          </div>
        </div>

        {/* Viewport */}
        <div
          className="relative bg-black"
          style={{ aspectRatio: orientation === 'portrait' ? '9/16' : '16/9' }}
        >
          {loading ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-white/40" />
            </div>
          ) : items.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-white/40 gap-3">
              <Play className="h-12 w-12" />
              <p className="text-sm">Aucun contenu dans cette playlist</p>
            </div>
          ) : (
            currentItem && renderItem(currentItem)
          )}

          {/* Progress bar */}
          {items.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
              <div
                className="h-full bg-white/60 transition-none"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Controls */}
        {items.length > 0 && (
          <div className="flex items-center justify-between gap-3 px-5 py-3 bg-black/80 backdrop-blur-sm border-t border-white/10">
            {/* Thumbnails strip */}
            <div className="flex items-center gap-1.5 overflow-x-auto flex-1 min-w-0">
              {items.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => goTo(idx)}
                  className={`flex-shrink-0 h-8 w-14 rounded-md overflow-hidden border transition-all ${
                    idx === currentIndex
                      ? 'border-white/70 opacity-100'
                      : 'border-white/10 opacity-40 hover:opacity-70'
                  }`}
                >
                  <ThumbnailSlot item={item} />
                </button>
              ))}
            </div>

            {/* Playback controls */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => goTo(currentIndex - 1)}
                className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10 rounded-lg"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPlaying((p) => !p)}
                className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10 rounded-lg"
              >
                {playing ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => goTo(currentIndex + 1)}
                className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10 rounded-lg"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => document.fullscreenElement
                  ? document.exitFullscreen()
                  : document.querySelector('[data-preview-viewport]')?.requestFullscreen()
                }
                className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10 rounded-lg ml-1"
              >
                <Maximize className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ThumbnailSlot({ item }: { item: PlaylistItem }) {
  if (item.app_type === 'image' && item.config?.imageUrl) {
    return (
      <img
        src={item.config.imageUrl}
        alt=""
        className="w-full h-full object-cover"
      />
    );
  }
  return (
    <div className="w-full h-full bg-slate-800 flex items-center justify-center">
      <Play className="h-3 w-3 text-white/40" />
    </div>
  );
}
