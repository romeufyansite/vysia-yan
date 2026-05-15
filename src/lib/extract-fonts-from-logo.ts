/**
 * Détecte des `font-family` dans un logo **SVG** (texte téléchargé en clair).
 * Limite aux **deux premières familles les plus pertinentes** (priorité attributs sur le texte).
 * PNG/JPG : tableau vide ; ce n’est pas bloquant.
 */
export async function extractFontFamiliesFromLogoUrl(logoUrl: string): Promise<string[]> {
  const url = logoUrl.trim();
  if (!url) return [];

  const looksSvg = /\.svg(\?|#|$)/i.test(url) || /image\/svg\+xml/i.test(url);

  const tryFetchSvg = async (): Promise<string | null> => {
    try {
      const res = await fetch(url, {
        credentials: 'omit',
        cache: 'no-store',
      });
      if (!res.ok) return null;
      const ct = res.headers.get('content-type') ?? '';
      if (!(looksSvg || ct.includes('svg') || ct.includes('xml'))) return null;
      const text = (await res.text()).slice(0, 580_000);
      if (!text.includes('<svg') && !text.includes('<?xml')) return null;
      return text;
    } catch {
      return null;
    }
  };

  const svg = await tryFetchSvg();
  if (!svg) return [];

  const canon = new Map<string, string>();
  const prio = new Map<string, number>();

  const bump = (raw: string, weight: number) => {
    const t = raw.replace(/\s+/g, ' ').trim().replace(/^["']|["']$/g, '');
    if (!t || t.length > 64) return;
    if (/^(sans-serif|serif|monospace|inherit|unset)$/i.test(t)) return;
    const k = t.toLowerCase();
    if (!canon.has(k)) canon.set(k, t);
    prio.set(k, (prio.get(k) ?? 0) + weight);
  };

  for (const m of svg.matchAll(/<(?:text|tspan)[^>]*font-family\s*=\s*["']([^"']+)["']/gi)) {
    for (const seg of splitFontFamilies(m[1])) bump(seg, 120);
  }
  for (const m of svg.matchAll(/\bfont-family\s*=\s*["']([^"']+)["']/gi)) {
    for (const seg of splitFontFamilies(m[1])) bump(seg, 65);
  }
  for (const m of svg.matchAll(/\bfont-family\s*:\s*([^};<]+)/gi)) {
    for (const seg of splitFontFamilies(m[1])) bump(seg, 22);
  }

  const MAX_LOGO_FONTS = 2;

  const ordered = [...prio.entries()].sort((a, b) => {
    const [ka, wa] = a;
    const [kb, wb] = b;
    if (wb !== wa) return wb - wa;
    return ka.localeCompare(kb);
  });

  return ordered
    .slice(0, MAX_LOGO_FONTS)
    .map(([key]) => canon.get(key)!)
    .filter(Boolean);
}

function splitFontFamilies(value: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q: "'" | '"' | null = null;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (q) {
      cur += ch;
      if (ch === q) q = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      q = ch;
      cur += ch;
      continue;
    }
    if (ch === ',') {
      if (cur.trim()) out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
