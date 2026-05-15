import type { SVGProps } from 'react';

/** Trait épais pour une silhouette lisible à ~16–18px de large. */
const FAT_STROKE = 3.5;

/**
 * Silhouette de corbeau en profil, traits épais pour une bonne lisibilité en petit format.
 * (Lucide ne fournit pas d’icône « crow ».)
 */
export function CrowIcon({ className, strokeWidth = FAT_STROKE, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {/* Profil : bec + tête, corps, aile, queue en pennons */}
      <path d="M10 8 8 6l2.2-1.6 3.6 1.2 3.5-2 3 3.4-2.2 2.8 2.8 2.4-4.6 1.3-.8 4.6L11 17l-3 1.2C5 18.2 3 16 3 13c0-2.9 2.5-5 6-5l1-3z" />
      <circle cx="8.3" cy="11.2" r="1.05" fill="currentColor" stroke="none" strokeWidth={0} />
    </svg>
  );
}
