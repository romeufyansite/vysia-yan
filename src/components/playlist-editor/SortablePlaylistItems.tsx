import { useMemo, useState } from 'react';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { PlaylistItem } from '@/types';
import { PlaylistItemCard } from '@/components/playlist-editor/PlaylistItemCard';
import { cn } from '@/lib/utils';

interface SortablePlaylistItemsProps {
  items: PlaylistItem[];
  draggable: boolean;
  onEdit?: (item: PlaylistItem) => void;
  onDelete?: (itemId: string) => void;
  onReorder: (nextOrderedItems: PlaylistItem[]) => Promise<void>;
}

interface SortRowProps {
  item: PlaylistItem;
  index: number;
  draggable: boolean;
  onEdit?: (item: PlaylistItem) => void;
  onDelete?: (itemId: string) => void;
}

function SortableRow({ item, index, draggable, onEdit, onDelete }: SortRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !draggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(draggable && isDragging && 'z-50 opacity-95')}
    >
      <PlaylistItemCard
        item={item}
        index={index}
        onEdit={onEdit ? () => onEdit(item) : undefined}
        onDelete={onDelete ? () => onDelete(item.id) : undefined}
        dragHandleProps={draggable ? { ...attributes, ...listeners } : undefined}
        isDragging={draggable ? isDragging : false}
      />
    </div>
  );
}

function DragPreview({ item, displayIndex }: { item: PlaylistItem; displayIndex: number }) {
  return (
    <div className="pointer-events-none w-full max-w-4xl scale-[1.02] shadow-xl">
      <PlaylistItemCard
        item={item}
        index={displayIndex}
        dragHandleProps={undefined}
        isDragging
      />
    </div>
  );
}

export function SortablePlaylistItems({
  items,
  draggable,
  onEdit,
  onDelete,
  onReorder,
}: SortablePlaylistItemsProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const itemIds = useMemo(() => items.map((i) => i.id), [items]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const activeItem = activeId ? items.find((i) => i.id === activeId) : undefined;

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(String(active.id));
  };

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    await onReorder(arrayMove(items, oldIndex, newIndex));
  };

  const handleDragCancel = () => setActiveId(null);

  const list = (
    <div className="space-y-3">
      {items.map((item, index) => (
        <SortableRow
          key={item.id}
          item={item}
          index={index}
          draggable={draggable}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );

  if (!draggable) {
    return (
      <div className="space-y-3">
        {items.map((item, index) => (
          <PlaylistItemCard
            key={item.id}
            item={item}
            index={index}
            onEdit={onEdit ? () => onEdit(item) : undefined}
            onDelete={onDelete ? () => onDelete(item.id) : undefined}
          />
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        {list}
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {activeItem ? (
          <DragPreview
            item={activeItem}
            displayIndex={Math.max(
              items.findIndex((i) => i.id === activeItem.id),
              0
            )}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
