import { Copy, CreditCard as Edit2, Eye, Menu, Monitor, Settings, Smartphone, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlaylistFirstItemPreview } from '@/components/playlists/PlaylistFirstItemPreview';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Playlist } from '@/types';

interface PlaylistCardProps {
  playlist: Playlist;
  groupName?: string;
  /** Écrans qui utilisent cette playlist (colonne `playlist_id` ou zones). */
  assignedScreens?: { id: string; name: string }[];
  onClick: () => void;
  onPreview: () => void;
  onEditSettings?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
}

export function PlaylistCard({
  playlist,
  groupName,
  assignedScreens = [],
  onClick,
  onPreview,
  onEditSettings,
  onDuplicate,
  onDelete,
}: PlaylistCardProps) {
  const isAssigned = assignedScreens.length > 0;

  const titleAndStatus = isAssigned ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="flex min-w-0 items-center gap-2 text-left transition-opacity hover:opacity-80"
        >
                      <h3 className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">{playlist.name}</h3>
          <span className="shrink-0 text-xs font-normal text-emerald-600">(affecté)</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="rounded-xl">
        {assignedScreens.map((screen) => (
          <DropdownMenuItem
            key={screen.id}
            onClick={(e) => {
              e.stopPropagation();
              window.location.hash = `/screens/${screen.id}`;
            }}
          >
            {screen.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    <div className="flex min-w-0 items-center gap-2">
                      <h3 className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">{playlist.name}</h3>
      <span className="shrink-0 text-xs font-normal text-red-500">(non affecté)</span>
    </div>
  );

  return (
    <Card className="relative overflow-hidden rounded-2xl border-0 bg-slate-100 shadow-none ring-0 transition-colors hover:bg-slate-200/35 [&:has(.playlist-card-body:hover)_.playlist-card-overlay]:opacity-100">
      <CardContent className="relative p-0">
        <div className="playlist-card-overlay pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center rounded-2xl bg-slate-100/65 opacity-0 backdrop-blur-[3px] transition-opacity duration-200">
          <Settings className="mb-2 h-10 w-10 text-slate-600" />
          <span className="text-sm font-normal text-slate-700">Modifier</span>
        </div>

        <div className="relative z-10 px-1 pb-0 pt-2.5">
          <div className="mb-3 flex items-start justify-between gap-2 border-b border-slate-300/50">
            <div className="flex min-w-0 flex-1 gap-2">
              <div
                className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                  isAssigned ? 'bg-emerald-500' : 'bg-red-500'
                }`}
              />
              <div className="min-w-0 flex-1">
                {titleAndStatus}
                <p
                  className={`mt-0.5 pb-1 text-[8px] font-normal leading-tight tracking-wide text-slate-500 ${
                    groupName?.trim() ? 'uppercase' : ''
                  }`}
                >
                  {groupName?.trim() ? groupName.trim() : 'Sans catégorie'}
                </p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-slate-500 hover:text-slate-800">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreview();
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Aperçu
                </DropdownMenuItem>
                {onEditSettings && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditSettings();
                    }}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Paramètres
                  </DropdownMenuItem>
                )}
                {onDuplicate && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicate();
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Dupliquer
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="playlist-card-body cursor-pointer" onClick={onClick}>
            <div className="relative mb-0 flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg px-px">
              {playlist.orientation === 'portrait' ? (
                <div
                  className="relative h-full overflow-hidden rounded-lg"
                  style={{ aspectRatio: '9/16' }}
                >
                  <PlaylistFirstItemPreview playlistId={playlist.id} />
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center p-0.5">
                  <div className="relative h-full w-full overflow-hidden rounded-lg">
                    <PlaylistFirstItemPreview playlistId={playlist.id} />
                  </div>
                </div>
              )}
              
              <span className="absolute top-1.5 right-1.5 z-10 inline-flex items-center gap-1 rounded-full bg-black/30 px-1.5 py-0.5 text-[10px] font-normal text-white backdrop-blur-sm">
                {playlist.orientation === 'portrait' ? (
                  <Smartphone className="h-3 w-3" />
                ) : (
                  <Monitor className="h-3 w-3" />
                )}
                {playlist.orientation === 'portrait' ? 'Portrait' : 'Paysage'}
              </span>
            </div>

           
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
