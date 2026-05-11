import { useEffect, useState } from 'react';
import { Globe, Layers, ListMusic } from 'lucide-react';
import { playlistService } from '@/services/playlist.service';
import type { PlaylistItem } from '@/types';

interface MediaConfigFields {
  imageUrl?: string;
  videoUrl?: string;
  url?: string;
  websiteUrl?: string;
}

function readMediaConfig(config: PlaylistItem['config']): MediaConfigFields {
  if (!config || typeof config !== 'object') return {};
  const o = config as Record<string, unknown>;
  const str = (k: string): string | undefined =>
    typeof o[k] === 'string' ? (o[k] as string) : undefined;
  return {
    imageUrl: str('imageUrl'),
    videoUrl: str('videoUrl'),
    url: str('url'),
    websiteUrl: str('websiteUrl'),
  };
}

function EmptyPlaylistPreview() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300">
      <Layers className="h-8 w-8 text-slate-500/80" />
    </div>
  );
}

function UnsupportedPreview({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
      <ListMusic className="h-4 w-4 text-white/45" />
      <span className="mt-1 max-w-[90%] truncate px-2 text-[9px] font-medium uppercase tracking-wide text-white/40">
        {label}
      </span>
    </div>
  );
}

export function PlaylistFirstItemPreview({ playlistId }: { playlistId: string }) {
  const [item, setItem] = useState<PlaylistItem | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    playlistService
      .getItems(playlistId)
      .then((items) => {
        if (!cancelled) setItem(items[0] ?? null);
      })
      .catch(() => {
        if (!cancelled) setItem(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [playlistId]);

  if (loading) {
    return <div className="h-full w-full animate-pulse bg-slate-200" />;
  }

  if (!item) {
    return <EmptyPlaylistPreview />;
  }

  const cfg = readMediaConfig(item.config);
  const { app_type } = item;

  if (app_type === 'image' && cfg.imageUrl) {
    return (
      <img src={cfg.imageUrl} alt="" className="h-full w-full object-cover" />
    );
  }

  const videoSrc = cfg.videoUrl || cfg.url;
  if (app_type === 'video' && videoSrc) {
    return (
      <video src={videoSrc} muted playsInline className="h-full w-full object-cover" />
    );
  }

  const siteUrl = cfg.websiteUrl || cfg.url;
  if (app_type === 'website' && siteUrl) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-slate-700 to-slate-900 px-2">
        <Globe className="h-5 w-5 text-sky-400/90" />
        <span className="max-w-full truncate text-center text-[9px] text-white/50" title={siteUrl}>
          {siteUrl.replace(/^https?:\/\//, '')}
        </span>
      </div>
    );
  }

  return <UnsupportedPreview label={app_type.replace(/-/g, ' ')} />;
}
