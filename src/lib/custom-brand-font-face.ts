/** Nom @font-face stable pour une entrée charte (UUID → identifiant CSS sûr). */
export function makeBrandFaceFamily(fontId: string): string {
  const compact = fontId.replace(/-/g, '').slice(0, 16);
  return `BrandFont_${compact}`;
}

export function guessFontFormatFromUrl(url: string): 'woff2' | 'woff' | 'truetype' | 'opentype' {
  const ext = url.split(/[#?]/)[0]?.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'woff2') return 'woff2';
  if (ext === 'woff') return 'woff';
  if (ext === 'ttf') return 'truetype';
  return 'opentype';
}
