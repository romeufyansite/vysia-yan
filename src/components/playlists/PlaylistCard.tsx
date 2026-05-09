import { MoveVertical as MoreVertical, Eye, CreditCard as Edit2, Copy, Trash2, Layers, Folder, Monitor, Smartphone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Playlist } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PlaylistCardProps {
  playlist: Playlist;
  groupName?: string;
  onClick: () => void;
  onPreview: () => void;
  onEditSettings?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
}

export function PlaylistCard({
  playlist,
  groupName,
  onClick,
  onPreview,
  onEditSettings,
  onDuplicate,
  onDelete,
}: PlaylistCardProps) {
  return (
    <Card
      onClick={onClick}
      className="overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer rounded-2xl bg-white"
    >
      <CardContent className="p-0">
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm truncate">{playlist.name}</h3>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-7 w-7 -mr-2">
                  <MoreVertical className="h-4 w-4 text-gray-400" />
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

          <div className="relative mb-4 aspect-video overflow-hidden rounded-lg bg-slate-100 flex items-center justify-center">
            {playlist.orientation === 'portrait' ? (
              <div className="relative h-full flex items-center justify-center" style={{ aspectRatio: '9/16' }}>
                <div className="absolute inset-0 bg-slate-200 rounded" />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-slate-300">
                  <Layers className="h-6 w-6 text-slate-500" />
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-200">
                  <Layers className="h-6 w-6 text-slate-500" />
                </div>
              </div>
            )}
            <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/30 backdrop-blur-sm px-2 py-0.5 text-[10px] font-medium text-white">
              {playlist.orientation === 'portrait' ? (
                <Smartphone className="h-3 w-3" />
              ) : (
                <Monitor className="h-3 w-3" />
              )}
              {playlist.orientation === 'portrait' ? 'Portrait' : 'Paysage'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
            <span className="truncate">
              Modifié{' '}
              {formatDistanceToNow(new Date(playlist.updated_at), {
                addSuffix: true,
                locale: fr,
              })}
            </span>
            {groupName && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 flex-shrink-0">
                <Folder className="h-3 w-3" />
                {groupName}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
