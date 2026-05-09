import { useEffect, useState } from 'react';
import { Layers, Menu } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Screen, Playlist } from '@/types';
import { playlistService } from '@/services/playlist.service';

interface ScreenCardProps {
  screen: Screen;
  playlists: Playlist[];
  onClick: () => void;
  onPlaylistChange: (playlistId: string) => void;
  onStatusChange: (status: 'online' | 'offline') => void;
  onPreview: () => void;
  onRefresh: () => void;
  onEdit: () => void;
  onMove: () => void;
  onDelete: () => void;
  onCreatePlaylist?: () => void;
}

export function ScreenCard({
  screen,
  playlists,
  onPlaylistChange,
  onStatusChange,
  onPreview,
  onRefresh,
  onEdit,
  onMove,
  onDelete,
  onCreatePlaylist,
}: ScreenCardProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [selectOpen, setSelectOpen] = useState(false);

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

  useEffect(() => {
    const loadPlaylistThumbnail = async () => {
      if (!screen.playlist_id) {
        setThumbnailUrl(null);
        return;
      }

      try {
        const items = await playlistService.getItems(screen.playlist_id);
        const firstImageItem = items.find(item => item.app_type === 'image');

        if (firstImageItem && firstImageItem.config?.imageUrl) {
          setThumbnailUrl(firstImageItem.config.imageUrl);
        } else {
          setThumbnailUrl(null);
        }
      } catch (error) {
        console.error('Error loading playlist thumbnail:', error);
        setThumbnailUrl(null);
      }
    };

    loadPlaylistThumbnail();
  }, [screen.playlist_id]);

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 rounded-2xl bg-white">
      <CardContent className="p-0">
        <div className="p-5">
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
                <DropdownMenuItem onClick={onRefresh}>
                  Actualiser
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onEdit}>
                  Éditer
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onMove}>
                  Déplacer
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-red-600">
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="text-[8px] text-gray-500 font-medium mb-3 -mt-3 ml-[18px]">
            {getDeviceTypeLabel(screen.device_type)}
          </div>

          <div className="relative aspect-video w-full rounded-lg mb-1 overflow-hidden flex items-center justify-center">
            {screen.orientation === 'portrait' ? (
              <div className="relative h-full rounded overflow-hidden flex items-center justify-center" style={{ aspectRatio: '9/16' }}>
                <div className="absolute inset-0 bg-gray-100" />
                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt="Playlist preview"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : null}
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-gray-100" />
                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt="Playlist preview"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="relative aspect-video w-full bg-gray-100 rounded-lg" />
                )}
              </div>
            )}
          </div>

          <div className="flex justify-center items-center mb-0.5">
            <div className="w-1 h-3 bg-gray-600" />
          </div>
          <div className="flex justify-center items-center mb-4">
            <div className="w-24 h-1 bg-gray-600" />
          </div>
          

          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <span className="text-xs text-gray-600 font-medium">Playlist</span>
            <Select
              value={screen.playlist_id || ''}
              onValueChange={onPlaylistChange}
              open={selectOpen}
              onOpenChange={setSelectOpen}
            >
              <SelectTrigger className="flex-1 h-9 rounded-lg border-gray-200 text-sm">
                <div className="flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5 text-gray-400" />
                  <SelectValue placeholder="Sélectionner" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {playlists.map((playlist) => (
                  <SelectItem key={playlist.id} value={playlist.id}>
                    {playlist.name}
                  </SelectItem>
                ))}
                <Button
                  variant="ghost"
                  className="w-full justify-start text-xs text-gray-600 mt-1 hover:bg-gray-100"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectOpen(false);
                    setTimeout(() => {
                      onCreatePlaylist?.();
                    }, 100);
                  }}
                >
                  + Créer une playlist
                </Button>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
