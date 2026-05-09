import { useState } from 'react';
import { SelectItem } from '@/components/ui/select';
import { Pencil, Trash2 } from 'lucide-react';
import type { ScreenGroup } from '@/types';

interface GroupSelectItemProps {
  group: ScreenGroup;
  isSelected: boolean;
  onEdit?: (group: ScreenGroup) => void;
  onDelete?: (group: ScreenGroup) => void;
}

export function GroupSelectItem({
  group,
  isSelected,
  onEdit,
  onDelete,
}: GroupSelectItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const showActions = !!onEdit || !!onDelete;

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onEdit?.(group);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete?.(group);
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative group/item"
    >
      <SelectItem value={group.id} className="rounded-lg">
        <div className="flex items-center justify-between w-full pr-16">
          <span className="truncate">{group.name}</span>

          {isHovered && showActions && (
            <div
              className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-0.5 z-50 ${isSelected ? 'right-7' : 'right-2'}`}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {onEdit && (
                <button
                  onMouseDown={handleEdit}
                  className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                  title="Modifier"
                  type="button"
                >
                  <Pencil className="h-3.5 w-3.5 text-gray-500 hover:text-gray-700" />
                </button>
              )}
              {onDelete && (
                <button
                  onMouseDown={handleDelete}
                  className="p-1.5 rounded-md hover:bg-red-50 transition-colors"
                  title="Supprimer"
                  type="button"
                >
                  <Trash2 className="h-3.5 w-3.5 text-gray-500 hover:text-red-600" />
                </button>
              )}
            </div>
          )}
        </div>
      </SelectItem>
    </div>
  );
}
