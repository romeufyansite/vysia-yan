/** Normalise un code hex (#RGB ou #RRGGBB → #RRGGBB majuscules). */
export function normalizeBrandHex(hex: string): string {
  let h = hex.trim().toUpperCase();
  if (!h.startsWith('#')) h = `#${h}`;
  if (h.length === 4 && /^#[0-9A-F]{3}$/.test(h)) {
    return `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  }
  if (/^#[0-9A-F]{6}$/.test(h)) return h;
  throw new Error(`Hex invalide: ${hex}`);
}

export function normalizedHexUpper(hex: string): string | null {
  try {
    return normalizeBrandHex(hex);
  } catch {
    return null;
  }
}
