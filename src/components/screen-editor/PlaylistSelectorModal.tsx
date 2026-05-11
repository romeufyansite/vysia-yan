import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ListMusic, X, Plus } from 'lucide-react';
import { playlistService } from '@/services/playlist.service';
import type { Playlist, PlaylistGroup, PlaylistItem } from '@/types';

interface PlaylistSelectorModalProps {
  open: boolean;
  onClose: () => void;
  zoneLabel: string;
  playlists: Playlist[];
  playlistGroups: PlaylistGroup[];
  onSelectPlaylist: (playlistId: string | null) => void;
  currentPlaylistId?: string | null;
  onAddPlaylist?: () => void;
}

function PlaylistThumbnail({
  playlistId,
  color,
}: {
  playlistId: string;
  color?: string;
}) {
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

  if (loading || !firstItem) {
    return (
      <div
        className="h-12 w-12 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0"
        style={{ backgroundColor: color || '#4c67f3' }}
      >
        <ListMusic className="h-6 w-6 text-white" />
      </div>
    );
  }

  const { app_type, config } = firstItem;

  if (app_type === 'image' && config?.imageUrl) {
    return (
      <img
        src={config.imageUrl}
        alt=""
        className="h-12 w-12 rounded-xl object-cover shadow-sm flex-shrink-0"
      />
    );
  }

  if (app_type === 'video' && (config?.videoUrl || config?.url)) {
    return (
      <div className="h-12 w-12 rounded-xl overflow-hidden shadow-sm flex-shrink-0 relative">
        <video
          src={config.videoUrl || config.url}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="w-4 h-4 rounded-full bg-white/90 flex items-center justify-center">
            <div className="w-0 h-0 border-l-[6px] border-l-slate-900 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent ml-0.5" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-12 w-12 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0"
      style={{ backgroundColor: color || '#4c67f3' }}
    >
      <ListMusic className="h-6 w-6 text-white" />
    </div>
  );
}

export function PlaylistSelectorModal({
  open,
  onClose,
  zoneLabel,
  playlists,
  playlistGroups,
  onSelectPlaylist,
  currentPlaylistId,
  onAddPlaylist,
}: PlaylistSelectorModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');

  const categories = useMemo(() => {
    const categoriesMap = new Map<string, PlaylistGroup>();

    playlistGroups.forEach((group) => {
      categoriesMap.set(group.id, group);
    });

    return categoriesMap;
  }, [playlistGroups]);

  const filteredPlaylists = useMemo(() => {
    if (selectedCategory === 'all') {
      return playlists;
    }
    return playlists.filter((p) => p.group_id === selectedCategory);
  }, [playlists, selectedCategory]);

  const handleSelect = (playlistId: string | null) => {
    onSelectPlaylist(playlistId);
    onClose();
  };

  const currentPlaylist = playlists.find((p) => p.id === currentPlaylistId);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between gap-4">
          <div className="text-left">
            <DialogTitle className="text-xl">Playlist pour {zoneLabel}</DialogTitle>
            <DialogDescription>
              Sélectionnez une playlist à assigner à cette zone
            </DialogDescription>
          </div>
          {onAddPlaylist && (
            <Button onClick={onAddPlaylist} size="sm" className="rounded-lg">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une playlist
            </Button>
          )}
        </DialogHeader>

        <div className="mt-4 space-y-4 overflow-hidden flex flex-col">
          {currentPlaylist && (
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-3 min-w-0">
                <PlaylistThumbnail playlistId={currentPlaylist.id} color={currentPlaylist.color} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{currentPlaylist.name}</p>
                  <p className="text-xs text-slate-500">Playlist actuelle</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSelect(null)}
                className="text-slate-500 hover:text-red-600 flex-shrink-0"
              >
                <X className="h-4 w-4 mr-1" />
                Retirer
              </Button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
              className="rounded-full"
            >
              Toutes
            </Button>
            {Array.from(categories.values()).map((group) => (
              <Button
                key={group.id}
                variant={selectedCategory === group.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(group.id)}
                className="rounded-full"
              >
                {group.name}
              </Button>
            ))}
          </div>

          <div className="overflow-y-auto flex-1 -mx-6 px-6">
            {playlists.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <ListMusic className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-base font-medium text-slate-900 mb-2">
                  Aucune playlist disponible
                </p>
                <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
                  Il n'y a pas de playlist pour cette orientation d'écran
                </p>
                {onAddPlaylist && (
                  <Button onClick={onAddPlaylist} className="rounded-lg">
                    <Plus className="h-4 w-4 mr-2" />
                    Créer une playlist
                  </Button>
                )}
              </div>
            ) : filteredPlaylists.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <ListMusic className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">Aucune playlist disponible dans cette catégorie</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
                {filteredPlaylists.map((playlist) => {
                  const group = playlist.group_id ? categories.get(playlist.group_id) : null;
                  const isSelected = currentPlaylistId === playlist.id;

                  return (
                    <button
                      key={playlist.id}
                      onClick={() => handleSelect(playlist.id)}
                      className={`group relative flex items-center gap-4 p-3 rounded-xl border-2 transition-all text-left hover:shadow-md ${
                        isSelected
                          ? 'border-slate-900 bg-slate-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <PlaylistThumbnail playlistId={playlist.id} color={playlist.color} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 text-sm leading-tight truncate">
                          {playlist.name}
                        </p>
                        {group && (
                          <p className="text-xs text-slate-500 mt-0.5">{group.name}</p>
                        )}
                      </div>
                      {isSelected && (
                        <div className="flex-shrink-0">
                          <div className="h-5 w-5 rounded-full bg-slate-900 flex items-center justify-center">
                            <svg
                              className="h-3 w-3 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
