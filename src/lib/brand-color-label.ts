import { normalizedHexUpper } from '@/lib/normalize-brand-hex';

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const d = max - min;

  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
        break;
      case gn:
        h = ((bn - rn) / d + 2) / 6;
        break;
      default:
        h = ((rn - gn) / d + 4) / 6;
        break;
    }
  }
  return { h: h * 360, s, l };
}

/** Libellé français approximatif à partir du hex (charte générique). */
export function frenchColorLabelFromHex(hex: string): string {
  let r = 128;
  let g = 128;
  let b = 128;
  const n = normalizedHexUpper(hex);
  if (n) {
    r = parseInt(n.slice(1, 3), 16);
    g = parseInt(n.slice(3, 5), 16);
    b = parseInt(n.slice(5, 7), 16);
  }
  const { h, s, l } = rgbToHsl(r, g, b);
  if (s < 0.12 && l > 0.88) return 'Blanc cassé';
  if (s < 0.12 && l < 0.12) return 'Noir';
  if (s < 0.12 && l <= 0.88 && l >= 0.45) return 'Gris neutre';
  if (s < 0.12) return 'Gris';

  let name: string;
  if (h < 12 || h >= 348) name = 'Rouge';
  else if (h < 30) name = 'Rouge corail';
  else if (h < 52) name = 'Orange';
  else if (h < 74) name = 'Ambre';
  else if (h < 100) name = 'Jaune';
  else if (h < 150) name = 'Vert lime';
  else if (h < 170) name = 'Vert sage';
  else if (h < 184) name = 'Vert émeraude';
  else if (h < 200) name = 'Cyan';
  else if (h < 246) name = 'Bleu';
  else if (h < 280) name = 'Indigo';
  else if (h < 310) name = 'Violet';
  else if (h < 330) name = 'Magenta';
  else name = 'Rose';

  if (l < 0.28) return `${name} profond`;
  if (s > 0.65 && l < 0.55) return `${name} vif`;
  return name;
}

export function allocateColorName(existingLowerNames: Set<string>, hex: string): string {
  const base = frenchColorLabelFromHex(hex);
  const key = base.toLowerCase();
  if (!existingLowerNames.has(key)) return base;

  let i = 2;
  while (existingLowerNames.has(`${base} ${i}`.toLowerCase())) i += 1;
  return `${base} ${i}`;
}
