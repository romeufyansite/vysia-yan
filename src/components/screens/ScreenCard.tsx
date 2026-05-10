import { useEffect, useState } from "react";
import { ListMusic, Settings, Menu, Eye, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Screen, PlaylistItem, Zone, ZoneTemplate } from '@/types';
import { playlistService } from '@/services/playlist.service';

interface ScreenCardProps {
  screen: Screen;
  onClick: () => void;
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
      {/* Overlay avec le label */}
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
  onClick,
  onStatusChange,
  onPreview,
  onEdit,
  onDelete,
}: ScreenCardProps) {
  const [isBodyHovered, setIsBodyHovered] = useState(false);

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
    <Card
      className="overflow-hidden hover:shadow-lg transition-all duration-200 rounded-2xl bg-white relative"
      onClick={onClick}
    >
      <CardContent className="p-0 relative">
        {/* Overlay blur - couvre toute la carte quand la partie basse est en hover */}
        <div
          className={`absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-2xl transition-opacity duration-300 cursor-pointer ${
            isBodyHovered ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          onClick={onClick}
        >
          <Settings className="h-12 w-12 text-gray-700 mb-2" />
          <span className="text-sm font-medium text-gray-700">Modifier</span>
        </div>

        <div className="p-5 relative z-20">
          {/* Header - toujours accessible, au dessus du blur */}
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        screen.status === 'online' ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    />
                    <h3 className="font-semibold text-sm">{screen.name}</h3>
                    <span className={`text-xs font-medium ${
                      screen.status === 'online' ? 'text-green-500' : 'text-red-500'
                    }`}>
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
            </div>

            {/* Menu 3 points */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-7 w-7 -mr-2">
                  <Menu className="h-5 w-5 text-gray-600" />
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

          <div className="text-[8px] text-gray-500 font-medium mb-6 -mt-3 ml-[18px] pb-4 border-b border-gray-200">
            {getDeviceTypeLabel(screen.device_type)}
          </div>

          {/* Body - déclenche le blur overlay au hover */}
          <div
            className="relative cursor-pointer"
            onMouseEnter={() => setIsBodyHovered(true)}
            onMouseLeave={() => setIsBodyHovered(false)}
            style={{ minHeight: '100px' }}
          >
            {/* Zone-based preview */}
            <div className="relative aspect-video w-full rounded-lg mb-1 overflow-hidden flex items-center justify-center">
              {screen.orientation === 'portrait' ? (
                <div className="relative h-full rounded overflow-hidden" style={{ aspectRatio: '9/16' }}>
                  <ScreenZonesPreview screen={screen} />
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center p-1">
                  <div className="relative w-full h-full rounded overflow-hidden">
                    <ScreenZonesPreview screen={screen} />
                  </div>
                </div>
              )}
            </div>

            {/* Stand */}
            <div className="flex justify-center items-center mb-0.5 pointer-events-none">
              <div className="w-1 h-3 bg-gray-600" />
            </div>
            <div className="flex justify-center items-center mb-4 pointer-events-none">
              <div className="w-24 h-1 bg-gray-600" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
