import { normalizedHexUpper } from '@/lib/normalize-brand-hex';

interface Bucket {
  sumR: number;
  sumG: number;
  sumB: number;
  count: number;
}

function rgbSaturation(r: number, g: number, b: number): number {
  const max = Math.max(r / 255, g / 255, b / 255);
  const min = Math.min(r / 255, g / 255, b / 255);
  if (max === 0) return 0;
  return (max - min) / max;
}

function rgbLuma(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function colorDistanceSquared(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
): number {
  return (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2;
}

/**
 * Palette dominante à partir de l’URL d’une image (Canvas + agrégation).
 * `crossOrigin: anonymous` requis pour les URLs cross-origin configurées en CORS.
 */
export async function extractDominantColorsFromImageUrl(
  imageUrl: string,
  maxColors = 6,
): Promise<string[]> {
  if (!imageUrl.trim()) return [];

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.referrerPolicy = 'no-referrer';

  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('IMAGE_LOAD'));
      img.src = imageUrl;
    });
  } catch {
    return [];
  }

  const nw = img.naturalWidth || img.width;
  const nh = img.naturalHeight || img.height;
  let w = nw;
  let h = nh;
  const scale = Math.min(240 / Math.max(w, 1), 240 / Math.max(h, 1), 1);
  w = Math.max(48, Math.floor(w * scale));
  h = Math.max(48, Math.floor(h * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];

  let pixels: Uint8ClampedArray;
  try {
    ctx.drawImage(img, 0, 0, w, h);
    pixels = ctx.getImageData(0, 0, w, h).data;
  } catch {
    return [];
  }

  const buckets = new Map<string, Bucket>();
  const step = Math.max(1, Math.floor((w * h) / 12000));

  for (let p = 0; p < w * h; p += step) {
    const i = p * 4;
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];

    if (a < 200) continue;
    const lum = rgbLuma(r, g, b);
    if (lum > 0.97 || lum < 0.035) continue;

    const qb = `${r >> 4},${g >> 4},${b >> 4}`;
    const bucket = buckets.get(qb);
    if (bucket) {
      bucket.sumR += r;
      bucket.sumG += g;
      bucket.sumB += b;
      bucket.count += 1;
    } else {
      buckets.set(qb, { sumR: r, sumG: g, sumB: b, count: 1 });
    }
  }

  const centroids = Array.from(buckets.values()).map((b) => ({
    count: b.count,
    r: Math.round(b.sumR / b.count),
    g: Math.round(b.sumG / b.count),
    b: Math.round(b.sumB / b.count),
  }));

  if (centroids.length === 0) return [];

  centroids.sort((a, b) => {
    const sa = rgbSaturation(a.r, a.g, a.b);
    const sb = rgbSaturation(b.r, b.g, b.b);
    const wa = Math.sqrt(a.count + 1) * (1 + sa * 2.2);
    const wb = Math.sqrt(b.count + 1) * (1 + sb * 2.2);
    return wb - wa;
  });

  const palette: Array<{ r: number; g: number; b: number }> = [];
  const minDistSq = 34 * 34;

  for (const c of centroids) {
    if (palette.every((picked) => colorDistanceSquared(picked, c) >= minDistSq)) {
      palette.push(c);
    }
    if (palette.length >= maxColors) break;
  }

  return palette.map((p) =>
    `#${[p.r, p.g, p.b].map((v) => v.toString(16).padStart(2, '0')).join('')}`.toUpperCase(),
  );
}

export function hexIsAlreadyListed(hex: string, existing: Iterable<string>): boolean {
  const n = normalizedHexUpper(hex);
  if (!n) return true;
  const setUp = new Set(
    [...existing].map((x) => normalizedHexUpper(x)).filter((x): x is string => !!x),
  );
  return setUp.has(n);
}
