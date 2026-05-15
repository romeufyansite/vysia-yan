import { CURATED_FONT_FAMILIES } from '@/data/curated-fonts';

export interface CatalogFontRow {
  slug: string;
  familyName: string;
  category: string;
}

type BunnyListJson = Record<string, { familyName: string; category: string }>;

let cachedCatalog: CatalogFontRow[] | null = null;

export async function loadBunnyFontCatalog(): Promise<CatalogFontRow[]> {
  if (cachedCatalog) return cachedCatalog;
  const res = await fetch('https://fonts.bunny.net/list');
  if (!res.ok) throw new Error(`Impossible de charger le catalogue (${res.status})`);
  const raw = (await res.json()) as BunnyListJson;
  cachedCatalog = Object.entries(raw).map(([slug, v]) => ({
    slug,
    familyName: v.familyName,
    category: v.category,
  }));
  cachedCatalog.sort((a, b) => a.familyName.localeCompare(b.familyName, 'fr'));
  return cachedCatalog;
}

export function searchFontCatalog(rows: CatalogFontRow[], query: string): CatalogFontRow[] {
  const q = query.trim().toLowerCase();
  const curatedLc = new Set(CURATED_FONT_FAMILIES.map((f) => f.toLowerCase()));

  if (!q) {
    const byName = new Map(rows.map((r) => [r.familyName.toLowerCase(), r]));
    const curated: CatalogFontRow[] = [];
    for (const name of CURATED_FONT_FAMILIES) {
      const row = byName.get(name.toLowerCase());
      if (row) curated.push(row);
    }
    const rest = rows.filter((r) => !curatedLc.has(r.familyName.toLowerCase()));
    return [...curated, ...rest];
  }

  return rows
    .filter(
      (r) =>
        r.familyName.toLowerCase().includes(q) ||
        r.slug.includes(q.replace(/\s+/g, '-')) ||
        r.category.toLowerCase().includes(q),
    )
    .slice(0, 160);
}
