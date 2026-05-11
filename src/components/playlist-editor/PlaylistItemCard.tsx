import { useState } from 'react';
import type { HTMLAttributes } from 'react';
import {
  TriangleAlert as AlertTriangle,
  GripVertical,
  Image as ImageIcon,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { PlaylistItem } from '@/types';
import { cn } from '@/lib/utils';

interface PlaylistItemCardProps {
  item: PlaylistItem;
  index: number;
  onEdit?: () => void;
  onDelete?: () => void;
  dragHandleProps?: HTMLAttributes<HTMLButtonElement>;
  isDragging?: boolean;
}

export function PlaylistItemCard({
  item,
  index,
  onEdit,
  onDelete,
  dragHandleProps,
  isDragging,
}: PlaylistItemCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const showActions = !!onEdit || !!onDelete;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')} : ${secs.toString().padStart(2, '0')}`;
  };

  const getAppColor = (appType: string) => {
    switch (appType) {
      case 'image':
        return 'bg-yellow-400';
      case 'announcement':
        return 'bg-blue-500';
      case 'social':
        return 'bg-purple-600';
      default:
        return 'bg-gray-400';
    }
  };

  const getAppIcon = (appType: string) => {
    switch (appType) {
      case 'image':
        return <ImageIcon className="h-8 w-8 text-white" />;
      default:
        return <ImageIcon className="h-8 w-8 text-white" />;
    }
  };

  const title = item.config?.title ?? 'Sans titre';

  const handleConfirmDelete = () => {
    onDelete?.();
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <div
        className={cn(
          'bg-white rounded-xl p-4 flex items-center gap-4 transition-shadow ring-1 ring-slate-200/70',
          isDragging ? 'shadow-lg shadow-slate-300/60 ring-blue-400/35' : 'hover:shadow-md'
        )}
      >
        {item.config?.hasError && (
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" aria-hidden />
        )}

        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
          <div className="flex shrink-0 items-center gap-0.5">
            <div className="min-w-[1.25rem] text-center text-sm font-medium tabular-nums text-slate-400">
              {index + 1}
            </div>
            {dragHandleProps && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 shrink-0 cursor-grab touch-none p-0 text-slate-400 hover:text-slate-700 active:cursor-grabbing"
                aria-label="Glisser pour réorganiser"
                {...dragHandleProps}
              >
                <GripVertical className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div
            className={`h-20 w-32 shrink-0 rounded-lg flex items-center justify-center ${getAppColor(item.app_type)}`}
          >
            {item.config?.imageUrl ? (
              <img
                src={item.config.imageUrl}
                alt={item.config.title || 'Preview'}
                className="h-full w-full rounded-lg object-cover"
              />
            ) : (
              getAppIcon(item.app_type)
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="truncate font-medium text-slate-900">{title}</h3>
            <p className="text-sm capitalize text-slate-500">{item.app_type}</p>
          </div>

          <div className="shrink-0 font-mono text-sm text-slate-600">
            {formatDuration(item.duration)}
          </div>

          {showActions && (
            <div className="ml-2 flex shrink-0 items-center gap-1 border-l border-slate-100 pl-2 sm:gap-2 sm:pl-3">
              {onEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  aria-label="Modifier cette carte"
                  onClick={onEdit}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 text-slate-500 hover:bg-red-50 hover:text-red-600"
                  aria-label="Supprimer cette carte"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-xl sm:rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette carte&nbsp;?</AlertDialogTitle>
            <AlertDialogDescription>
              «&nbsp;{title}&nbsp;» sera retiré de la playlist. Cette action est immédiate et ne peut
              pas être annulée depuis l&apos;historique.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl mt-2 sm:mt-0">Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-red-600 hover:bg-red-700 focus:ring-red-600"
              onClick={handleConfirmDelete}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
