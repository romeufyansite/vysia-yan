import { TriangleAlert as AlertTriangle, MoveVertical as MoreVertical, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { PlaylistItem } from '@/types';

interface PlaylistItemCardProps {
  item: PlaylistItem;
  index: number;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function PlaylistItemCard({ item, index, onEdit, onDelete }: PlaylistItemCardProps) {
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

  return (
    <div className="bg-white rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
      {item.config?.hasError && (
        <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
      )}

      <div className="flex items-center gap-4 flex-1">
        <div className="text-gray-400 font-medium min-w-[24px]">
          {index + 1}
        </div>

        <div
          className={`w-32 h-20 rounded-lg flex items-center justify-center ${getAppColor(item.app_type)}`}
        >
          {item.config?.imageUrl ? (
            <img
              src={item.config.imageUrl}
              alt={item.config.title || 'Preview'}
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            getAppIcon(item.app_type)
          )}
        </div>

        <div className="flex-1">
          <h3 className="font-medium text-gray-900">
            {item.config?.title || 'Sans titre'}
          </h3>
          <p className="text-sm text-gray-500 capitalize">
            {item.app_type}
          </p>
        </div>

        <div className="text-gray-600 font-mono">
          {formatDuration(item.duration)}
        </div>

        {showActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  Modifier
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem onClick={onDelete} className="text-red-600">
                  Supprimer
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
