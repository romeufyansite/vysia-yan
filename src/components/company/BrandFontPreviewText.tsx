import { useEffect, useMemo } from 'react';

import { guessFontFormatFromUrl } from '@/lib/custom-brand-font-face';

/** Ultraplat pour cartes — montre la graisse sans occuper la hauteur */
const SPECIMEN_MICRO = 'Aa · titre · 012';

function bunnyStylesheetHref(familyName: string): string {
  const q = encodeURIComponent(familyName).replace(/%20/g, '+');
  return `https://fonts.bunny.net/css2?family=${q}:wght@400;600&display=swap`;
}

export function BrandFontPreviewBlock({
  cssFamily,
  titleInFont,
  webfontFamily,
  fontFileUrl,
  faceFamily,
}: {
  cssFamily: string;
  titleInFont?: string | null;
  /** Charge la famille depuis Bunny (catalogue type Google Fonts) */
  webfontFamily?: string | null;
  fontFileUrl?: string | null;
  faceFamily?: string | null;
}) {
  const resolvedFamily = useMemo(() => {
    if (fontFileUrl?.trim() && faceFamily?.trim()) {
      const safe = faceFamily.trim().replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return `'${safe}', sans-serif`;
    }
    return cssFamily.trim() || 'sans-serif';
  }, [cssFamily, fontFileUrl, faceFamily]);

  const fam = resolvedFamily;
  const heading = titleInFont?.trim() || 'Aa';

  useEffect(() => {
    const wf = webfontFamily?.trim();
    if (!wf || fontFileUrl?.trim()) return;
    const href = bunnyStylesheetHref(wf);
    for (const el of document.querySelectorAll('link[data-vysia-bunny-font]')) {
      if (el.getAttribute('data-vysia-bunny-font') === href) return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute('data-vysia-bunny-font', href);
    document.head.appendChild(link);
  }, [webfontFamily, fontFileUrl]);

  useEffect(() => {
    const url = fontFileUrl?.trim();
    const face = faceFamily?.trim();
    if (!url || !face) return;
    const fmt = guessFontFormatFromUrl(url);
    const safeFace = face.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const style = document.createElement('style');
    const uid = `vysia-face-${Math.random().toString(36).slice(2, 9)}`;
    style.id = uid;
    style.textContent = `@font-face{font-family:'${safeFace}';src:url(${JSON.stringify(url)}) format('${fmt}');font-weight:400 700;font-style:normal;font-display:swap;}`;
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, [fontFileUrl, faceFamily]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200/60 bg-white/90 px-3 py-2">
      <p
        style={{ fontFamily: fam }}
        className="truncate text-[17px] font-semibold leading-tight tracking-tight text-slate-900"
      >
        {heading}
      </p>
      <p
        style={{ fontFamily: fam }}
        className="mt-1 truncate text-[12px] font-normal tabular-nums text-slate-500"
      >
        {SPECIMEN_MICRO}
      </p>
    </div>
  );
}
