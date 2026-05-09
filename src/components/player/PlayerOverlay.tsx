import { useEffect, useState } from 'react';
import { Clock, CloudSun, Megaphone, Image as ImageIcon } from 'lucide-react';

interface OverlayData {
  id: string;
  type: 'clock' | 'weather' | 'announcement' | 'logo';
  enabled: boolean;
  position: { x: number; y: number };
  config?: {
    city?: string;
    unit?: 'celsius' | 'fahrenheit';
    text?: string;
    imageUrl?: string;
  };
}

export function PlayerOverlay({ overlay }: { overlay: OverlayData }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    if (overlay.type !== 'clock') return;
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, [overlay.type]);

  return (
    <div
      className="absolute bg-black/70 backdrop-blur-md text-white rounded-xl shadow-lg ring-1 ring-white/10"
      style={{
        left: `${overlay.position.x}%`,
        top: `${overlay.position.y}%`,
      }}
    >
      {overlay.type === 'clock' && (
        <div className="flex items-center gap-2 px-5 py-3">
          <Clock className="h-5 w-5 text-blue-300" />
          <span className="text-xl font-semibold tabular-nums">
            {time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}
      {overlay.type === 'weather' && (
        <div className="flex items-center gap-2 px-5 py-3">
          <CloudSun className="h-5 w-5 text-amber-300" />
          <span className="text-lg font-medium">
            {overlay.config?.city || 'Paris'} · 24°
            {overlay.config?.unit === 'fahrenheit' ? 'F' : 'C'}
          </span>
        </div>
      )}
      {overlay.type === 'announcement' && overlay.config?.text && (
        <div className="flex items-center gap-2 px-5 py-3 max-w-2xl">
          <Megaphone className="h-5 w-5 text-rose-300 flex-shrink-0" />
          <span className="text-base font-medium whitespace-nowrap overflow-hidden">
            {overlay.config.text}
          </span>
        </div>
      )}
      {overlay.type === 'logo' && (
        <div className="px-4 py-3">
          {overlay.config?.imageUrl ? (
            <img
              src={overlay.config.imageUrl}
              alt="Logo"
              className="h-12 w-auto object-contain"
            />
          ) : (
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-emerald-300" />
              <span className="font-medium">Logo</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
