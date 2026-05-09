import { Image as ImageIcon, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MediaAsset } from '@/types';

interface MediaAssetCardProps {
  asset: MediaAsset;
  onDelete?: (id: string) => void;
  onSelect?: (asset: MediaAsset) => void;
}

export function MediaAssetCard({ asset, onDelete, onSelect }: MediaAssetCardProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleClick = () => {
    if (onSelect) {
      onSelect(asset);
    }
  };

  return (
    <div
      className={`border rounded-lg overflow-hidden hover:shadow-md transition-shadow ${
        onSelect ? 'cursor-pointer' : ''
      }`}
      onClick={handleClick}
    >
      <div className="aspect-square bg-gray-100 relative group">
        {asset.file_type === 'image' ? (
          <img
            src={asset.file_url}
            alt={asset.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-12 w-12 text-gray-400" />
          </div>
        )}

        {!onSelect && onDelete && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button
              variant="destructive"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(asset.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="text-sm font-medium truncate mb-1">{asset.name}</p>
        <p className="text-xs text-gray-500">{formatFileSize(asset.file_size)}</p>
      </div>
    </div>
  );
}
