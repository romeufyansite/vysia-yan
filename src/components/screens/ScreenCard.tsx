import { useEffect, useState } from "react";
import { ListMusic, Menu, Settings } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Screen, PlaylistItem, ZoneTemplate } from '@/types';
import { playlistService } from '@/services/playlist.service';

interface ScreenCardProps {
  screen: Screen;
  onStatusChange: (status: 'online' | 'offline') => void;
  onPreview: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const TEMPLATE_LAYOUTS: Record<ZoneTemplate, { zones: number; className: string }> = {
  fullscreen: { zones: 1, className: 'grid-cols-1' },
  '70-30': { zones: 2, className: 'grid-cols-[70%_30%]' },
  '30-70': { zones: 2, className: 'grid-cols-[30%_70%]' },
  banner: { zones: 2, className: 'grid-rows-[80%_20%]' },
};

function ZoneThumbnail({ playlistId, zoneLabel }: { playlistId: string | null; zoneLabel: string }) {
  const [item, setItem] = useState<PlaylistItem | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!playlistId) {
      setItem(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    playlistService
      .getItems(playlistId)
      .then((items) => {
        if (!cancelled) setItem(items[0] || null);
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

  const renderContent = () => {
    if (loading) {
      return <div className="w-full h-full bg-gray-200 animate-pulse" />;
    }

    if (!item) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
          <ListMusic className="h-3 w-3 text-white/40" />
          <span className="text-[6px] text-white/30 uppercase mt-0.5">{zoneLabel}</span>
        </div>
      );
    }

    const { app_type, config } = item;

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
          muted
          playsInline
          className="w-full h-full object-cover"
        />
      );
    }

    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
        <ListMusic className="h-3 w-3 text-white/40" />
        <span className="text-[6px] text-white/30 uppercase mt-0.5">{zoneLabel}</span>
      </div>
    );
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      {renderContent()}
      <div className="absolute inset-0 bg-black/20" />
    </div>
  );
}

function ScreenZonesPreview({ screen }: { screen: Screen }) {
  const template = screen.template || 'fullscreen';
  const layout = TEMPLATE_LAYOUTS[template];
  const zones = screen.zones || [];

  return (
    <div className={`w-full h-full grid ${layout.className} ${template === 'banner' ? 'grid-rows-[80%_20%]' : ''} overflow-hidden rounded`}>
      {Array.from({ length: layout.zones }).map((_, index) => {
        const zone = zones[index];
        const zoneLabel = `Zone ${String.fromCharCode(65 + index)}`;

        return (
          <div key={index} className="relative overflow-hidden">
            <ZoneThumbnail playlistId={zone?.playlist_id || null} zoneLabel={zoneLabel} />
          </div>
        );
      })}
    </div>
  );
}

export function ScreenCard({
  screen,
  onStatusChange,
  onPreview,
  onEdit,
  onDelete,
}: ScreenCardProps) {
  const getDeviceTypeLabel = (deviceType?: string) => {
    switch (deviceType) {
      case 'connected_tv':
        return 'TV CONNECTÉE';
      case 'web_browser':
        return 'NAVIGATEUR WEB';
      case 'non_connected_tv':
        return 'TV NON-CONNECTÉE';
      default:
        return 'TV CONNECTÉE';
    }
  };

  return (
    <Card className="relative overflow-hidden rounded-2xl border-0 bg-slate-100 shadow-none ring-0 transition-colors hover:bg-slate-200/35 [&:has(.screen-card-body:hover)_.screen-card-overlay]:opacity-100">
      <CardContent className="relative p-0">
        <div className="screen-card-overlay pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center rounded-2xl bg-slate-100/65 opacity-0 backdrop-blur-[3px] transition-opacity duration-200">
          <Settings className="mb-2 h-10 w-10 text-slate-600" />
          <span className="text-sm font-normal text-slate-700">Modifier</span>
        </div>

        <div className="relative z-10 px-1.5 pb-0 pt-2">
          <div className="mb-3 flex items-start justify-between gap-2 border-b border-slate-300/50">
            <div className="flex min-w-0 flex-1 gap-2">
              <div
                className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                  screen.status === 'online' ? 'bg-emerald-500' : 'bg-red-500'
                }`}
              />
              <div className="min-w-0 flex-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex min-w-0 items-center gap-2 text-left transition-opacity hover:opacity-80">
                      <h3 className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">{screen.name}</h3>
                      <span
                        className={`shrink-0 text-xs font-normal ${
                          screen.status === 'online' ? 'text-emerald-600' : 'text-red-500'
                        }`}
                      >
                        ({screen.status === 'online' ? 'En ligne' : 'Hors ligne'})
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => onStatusChange('online')}>
                    Marquer comme en ligne
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange('offline')}>
                    Marquer comme hors ligne
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

                <p className="mt-0.5 pb-1 text-[8px] font-normal uppercase leading-tight tracking-wide text-slate-500">
                  {getDeviceTypeLabel(screen.device_type)}
                </p>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-slate-500 hover:text-slate-800">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onPreview}>
                  Aperçu
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onEdit}>
                  Modifier
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-red-600">
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Body - déclenche le blur overlay au hover */}
          <div
            className="screen-card-body relative cursor-pointer"
            onClick={onEdit}
          >
            {/* Zone-based preview */}
            <div className="relative mb-0 flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg px-px">
              {screen.orientation === 'portrait' ? (
                <div className="relative h-full rounded overflow-hidden" style={{ aspectRatio: '9/16' }}>
                  <ScreenZonesPreview screen={screen} />
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center p-0.5">
                  <div className="relative w-full h-full rounded overflow-hidden">
                    <ScreenZonesPreview screen={screen} />
                  </div>
                </div>
              )}
            </div>

            {/* Stand */}
            <div className="mb-0.5 flex items-center justify-center">
              <div className="h-3 w-1 rounded-[1px] bg-slate-500" />
            </div>
            <div className="flex items-center justify-center pb-px">
              <div className="h-1 w-24 rounded-full bg-slate-500/90" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
