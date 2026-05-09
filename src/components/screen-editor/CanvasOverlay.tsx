import { useEffect, useRef, useState } from 'react';
import { Clock, CloudSun, Megaphone, Image as ImageIcon } from 'lucide-react';
import type { Overlay } from '@/types';

interface CanvasOverlayProps {
  overlay: Overlay;
  onMove: (x: number, y: number) => void;
}

export function CanvasOverlay({ overlay, onMove }: CanvasOverlayProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    if (overlay.type !== 'clock') return;
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, [overlay.type]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;

    setDragging(true);
    el.setPointerCapture(e.pointerId);

    const parentRect = parent.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = overlay.position.x;
    const startTop = overlay.position.y;

    const onMoveHandler = (ev: PointerEvent) => {
      const dx = ((ev.clientX - startX) / parentRect.width) * 100;
      const dy = ((ev.clientY - startY) / parentRect.height) * 100;
      const nextX = Math.min(95, Math.max(0, startLeft + dx));
      const nextY = Math.min(95, Math.max(0, startTop + dy));
      onMove(nextX, nextY);
    };

    const onUp = () => {
      setDragging(false);
      el.releasePointerCapture(e.pointerId);
      window.removeEventListener('pointermove', onMoveHandler);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMoveHandler);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div
      ref={ref}
      onPointerDown={handlePointerDown}
      className={`absolute pointer-events-auto select-none cursor-move bg-black/70 backdrop-blur-md text-white rounded-xl text-sm shadow-lg ring-1 ring-white/10 transition-shadow ${
        dragging ? 'shadow-2xl ring-white/30' : 'hover:ring-white/20'
      }`}
      style={{
        left: `${overlay.position.x}%`,
        top: `${overlay.position.y}%`,
      }}
    >
      {overlay.type === 'clock' && (
        <div className="flex items-center gap-2 px-4 py-2.5">
          <Clock className="h-4 w-4 text-blue-300" />
          <span className="font-medium tabular-nums">
            {time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}
      {overlay.type === 'weather' && (
        <div className="flex items-center gap-2 px-4 py-2.5">
          <CloudSun className="h-4 w-4 text-amber-300" />
          <span className="font-medium">
            {overlay.config?.city || 'Paris'} · 24°{overlay.config?.unit === 'fahrenheit' ? 'F' : 'C'}
          </span>
        </div>
      )}
      {overlay.type === 'announcement' && (
        <div className="flex items-center gap-2 px-4 py-2.5 max-w-xs">
          <Megaphone className="h-4 w-4 text-rose-300 flex-shrink-0" />
          <span className="truncate font-medium">
            {overlay.config?.text || 'Votre annonce ici'}
          </span>
        </div>
      )}
      {overlay.type === 'logo' && (
        <div className="px-3 py-2">
          {overlay.config?.imageUrl ? (
            <img
              src={overlay.config.imageUrl}
              alt="Logo"
              className="h-10 w-auto object-contain"
              draggable={false}
            />
          ) : (
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-emerald-300" />
              <span className="font-medium">Logo</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
