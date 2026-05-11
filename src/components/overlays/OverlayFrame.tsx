import { useCallback, useRef, useState, type CSSProperties } from 'react';
import { GripVertical } from 'lucide-react';
import type { Overlay } from '@/types';
import {
  clampOverlayPercent,
  getOverlayWrapperStyle,
  percentPointFromClient,
} from '@/lib/overlay-position';
import { OverlayContent } from '@/components/overlays/OverlayContent';
import { cn } from '@/lib/utils';

interface OverlayFrameProps {
  overlay: Overlay;
  pointerEvents?: 'auto' | 'none';
  zIndex?: number;
  draggable?: boolean;
  stageRef?: React.RefObject<HTMLElement | null>;
  onDragPosition?: (id: string, x: number, y: number) => void;
}

export function OverlayFrame({
  overlay,
  pointerEvents = 'none',
  zIndex = 30,
  draggable = false,
  stageRef,
  onDragPosition,
}: OverlayFrameProps) {
  const [dragging, setDragging] = useState(false);
  const [elevated, setElevated] = useState(false);
  const dragActiveRef = useRef(false);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const rootRef = useRef<HTMLDivElement>(null);

  const baseStyle = getOverlayWrapperStyle(overlay, elevated ? 50 : zIndex);
  const needsPointer = draggable || pointerEvents === 'auto';

  const style: CSSProperties = {
    ...baseStyle,
    pointerEvents: needsPointer ? 'auto' : 'none',
  };

  const onPointerDownDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggable || !stageRef?.current || !onDragPosition) return;
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = stageRef.current.getBoundingClientRect();
      const click = percentPointFromClient(rect, e.clientX, e.clientY);
      const br = rootRef.current?.getBoundingClientRect();
      if (br && rect.width > 0 && rect.height > 0) {
        const cx = clampOverlayPercent(((br.left + br.width / 2 - rect.left) / rect.width) * 100);
        const cy = clampOverlayPercent(((br.top + br.height / 2 - rect.top) / rect.height) * 100);
        dragOffsetRef.current = { x: click.x - cx, y: click.y - cy };
      } else {
        dragOffsetRef.current = {
          x: click.x - overlay.position.x,
          y: click.y - overlay.position.y,
        };
      }
      dragActiveRef.current = true;
      setDragging(true);
      setElevated(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [draggable, onDragPosition, overlay.position.x, overlay.position.y, stageRef]
  );

  const onPointerMoveDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragActiveRef.current || !stageRef?.current || !onDragPosition) return;
      const rect = stageRef.current.getBoundingClientRect();
      const pt = percentPointFromClient(rect, e.clientX, e.clientY);
      const nx = clampOverlayPercent(pt.x - dragOffsetRef.current.x);
      const ny = clampOverlayPercent(pt.y - dragOffsetRef.current.y);
      onDragPosition(overlay.id, nx, ny);
    },
    [onDragPosition, overlay.id, stageRef]
  );

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragActiveRef.current) return;
    dragActiveRef.current = false;
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    setElevated(false);
  }, []);

  return (
    <div
      ref={rootRef}
      className={cn(
        'max-w-[96%]',
        draggable &&
          'group cursor-grab touch-none active:cursor-grabbing [&_iframe]:pointer-events-none [&_video]:pointer-events-none [&_img]:pointer-events-none'
      )}
      style={style}
      onPointerDown={draggable ? onPointerDownDrag : undefined}
      onPointerMove={draggable ? onPointerMoveDrag : undefined}
      onPointerUp={draggable ? endDrag : undefined}
      onPointerCancel={draggable ? endDrag : undefined}
    >
      <div
        className={cn(
          'relative',
          draggable && 'select-none rounded-xl ring-0 transition-shadow',
          dragging && 'ring-2 ring-white/50'
        )}
      >
        {draggable && (
          <div
            className={cn(
              'pointer-events-none absolute left-1/2 top-1 z-10 flex h-4 -translate-x-1/2 items-center gap-0.5 rounded bg-slate-900/75 px-1.5 text-[8px] font-medium text-white/85',
              dragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
            aria-hidden
          >
            <GripVertical className="h-2.5 w-2.5 shrink-0 opacity-70" />
            Glisser
          </div>
        )}
        <OverlayContent overlay={overlay} />
      </div>
    </div>
  );
}
