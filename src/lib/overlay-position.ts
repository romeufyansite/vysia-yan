import type { CSSProperties } from 'react';
import type { Overlay, OverlayPositionAnchor } from '@/types';

const ANCHOR_TRANSFORM: Record<OverlayPositionAnchor, string> = {
  'top-left': 'translate(0, 0)',
  'top-center': 'translate(-50%, 0)',
  'top-right': 'translate(-100%, 0)',
  'center-left': 'translate(0, -50%)',
  'center-right': 'translate(-100%, -50%)',
  'bottom-left': 'translate(0, -100%)',
  'bottom-center': 'translate(-50%, -100%)',
  'bottom-right': 'translate(-100%, -100%)',
  center: 'translate(-50%, -50%)',
};

export function clampOverlayPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/** Position absolue sur le canevas logique : x/y sont des pourcentages (0–100) du cadre scène. */
export function getOverlayWrapperStyle(overlay: Overlay, zIndex = 30): CSSProperties {
  const anchor: OverlayPositionAnchor = overlay.config?.positionAnchor ?? 'center';
  const x = clampOverlayPercent(overlay.position.x);
  const y = clampOverlayPercent(overlay.position.y);
  return {
    position: 'absolute',
    left: `${x}%`,
    top: `${y}%`,
    transform: ANCHOR_TRANSFORM[anchor],
    zIndex,
  };
}

/** Pendant le glisser-déposer, le point suivi est le centre du widget (ancre center). */
export function percentPointFromClient(
  containerRect: DOMRect,
  clientX: number,
  clientY: number
): { x: number; y: number } {
  const w = containerRect.width || 1;
  const h = containerRect.height || 1;
  return {
    x: clampOverlayPercent(((clientX - containerRect.left) / w) * 100),
    y: clampOverlayPercent(((clientY - containerRect.top) / h) * 100),
  };
}
