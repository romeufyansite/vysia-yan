import { createClient } from 'npm:@supabase/supabase-js@2.58.0';
import { assertFetchablePublicUrl } from '../_shared/assertFetchablePublicUrl.ts';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, prefer, accept',
};

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const UA = 'VysiaBrandBot/1.0 (+https://vysia.app)';

const MAX_SITE_SUGGESTIONS = 3;

const IGNORE_FAMILIES = new Set<string>([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-rounded',
  'ui-monospace',
  'emoji',
  'math',
  'fangsong',
  'inherit',
  'initial',
  'unset',
  'revert',
  'revert-layer',
  'none',
  'auto',
  '-apple-system',
  'blinkmacsystemfont',
]);

type TierKey = 'head' | 'sub' | 'body';

interface SiteFontSuggestion {
  family: string;
  /** Rôle métier lisible dans l’app */
  role: string;
}

function stripCssComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, ' ');
}

function stripOuterQuotes(s: string): string {
  let t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    t = t.slice(1, -1).trim();
  }
  return t;
}

function splitFontStack(value: string): string[] {
  const parts: string[] = [];
  let cur = '';
  let q: "'" | '"' | null = null;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (q) {
      if (ch === '\\' && value[i + 1]) {
        cur += value[i + 1];
        i++;
        continue;
      }
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
      if (stripOuterQuotes(cur)) parts.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (stripOuterQuotes(cur)) parts.push(cur.trim());
  return parts;
}

function normalizeFontFamilyToken(raw: string): string | null {
  const t = stripOuterQuotes(raw).trim().replace(/\s+/g, ' ');
  if (!t || t.length > 72) return null;
  const low = t.toLowerCase();
  if (IGNORE_FAMILIES.has(low)) return null;
  const last = low.split(/\s+/).pop();
  if (last && IGNORE_FAMILIES.has(last)) return null;
  if (low.startsWith('var(--')) return null;
  if (/^[-_]/.test(t)) return null;
  if (!/[a-zA-Z]/.test(t)) return null;
  return t;
}

/** Sélecteurs plats avant la dernière « { » précédant cette position (CSS non trop imbriqué). */
function getRuleSelectorBefore(css: string, fontIndex: number): string {
  const before = css.slice(0, fontIndex);
  const openBrace = before.lastIndexOf('{');
  if (openBrace < 0) return '';
  const afterPrevClose = before.lastIndexOf('}', openBrace);
  const start = Math.max(0, afterPrevClose + 1);
  return css.slice(start, openBrace).trim();
}

function classifySelector(selCombined: string): TierKey | null {
  let s = selCombined.replace(/\s+/g, ' ').trim();
  if (!s.length || /^@(font-face|charset|import|keyframes|supports|counter-style)/i.test(s)) {
    return null;
  }
  s = s.toLowerCase();

  const headline =
    /\bh[1-3]\b/.test(s) ||
    /\.([\w-]*)(title|heading|hero)([\w-]*)?\b/i.test(selCombined) ||
    /\.([\w-]*)(display-large|display-lg|masthead)/i.test(selCombined);
  if (headline) return 'head';

  const sub =
    /\bh[4-6]\b/.test(s) ||
    /\.([\w-]*)?(subtitle|sub-title|subheading|intertitle|deck|lead|tagline|kicker)([\w-]*)?\b/i.test(selCombined);
  if (sub) return 'sub';

  const body =
    /\b(html|body)\b/.test(s) ||
    /\bp\b(?![a-z_-])/.test(s) ||
    /\.([\w-]*)?(content|article|post-body|prose|rte|wysiwyg|entry-body)([\w-]*)?\b/i.test(selCombined);
  if (body) return 'body';

  return null;
}

/** Polices utilisées comme titres dans des balises (inline style). */
function extractHeadingInlineFonts(html: string, bumpTier: TierBump): void {
  for (const m of html.matchAll(/<h[1-3][^>]*\sstyle\s*=\s*["']([^"']*)["'][^>]*>/gi)) {
    const fm = /font-family\s*:\s*([^;]+)/i.exec(m[1] ?? '');
    if (!fm) continue;
    for (const part of splitFontStack(fm[1])) {
      bumpTier(part, 'head', 70);
    }
  }
}

function extractSubtitleInlineFonts(html: string, bumpTier: TierBump): void {
  for (const m of html.matchAll(/<h[4-6][^>]*\sstyle\s*=\s*["']([^"']*)["'][^>]*>/gi)) {
    const fm = /font-family\s*:\s*([^;]+)/i.exec(m[1] ?? '');
    if (!fm) continue;
    for (const part of splitFontStack(fm[1])) bumpTier(part, 'sub', 55);
  }
}

function extractBodyInlineFonts(html: string, bumpTier: TierBump): void {
  for (const tag of ['body', 'main', 'article', 'p']) {
    const re = new RegExp(`<${tag}[^>]*\\sstyle\\s*=\\s*["']([^"']*)["'][^>]*>`, 'gi');
    for (const m of html.matchAll(re)) {
      const fm = /font-family\s*:\s*([^;]+)/i.exec(m[1] ?? '');
      if (!fm) continue;
      for (const part of splitFontStack(fm[1])) bumpTier(part, 'body', 45);
    }
  }
}

type TierBump = (raw: string, tier: TierKey, weight: number) => void;

function makeTierModel() {
  const canon = new Map<string, string>();
  const tiers: Record<TierKey, Map<string, number>> = {
    head: new Map(),
    sub: new Map(),
    body: new Map(),
  };
  const weakGlobal = new Map<string, number>();

  const bump = (map: Map<string, number>, raw: string, w: number): void => {
    const tok = normalizeFontFamilyToken(raw);
    if (!tok) return;
    const key = tok.toLowerCase();
    if (!canon.has(key)) canon.set(key, tok);
    map.set(key, (map.get(key) ?? 0) + w);
  };

  const bumpTier: TierBump = (raw, tier, weight) => {
    bump(tiers[tier], raw, weight);
  };

  const bumpWeak = (raw: string, w: number) => bump(weakGlobal, raw, w);

  return { canon, tiers, weakGlobal, bumpTier, bumpWeak };
}

function iterateFontFamiliesWithSelectors(cssInput: string, bumpTier: TierBump, bumpWeak: (r: string, w: number) => void): void {
  const css = stripCssComments(cssInput);
  const ff = /font-family\s*:\s*([^;}]+)/gi;
  for (const m of css.matchAll(ff)) {
    const idx = m.index ?? 0;
    const sel = getRuleSelectorBefore(css, idx);
    const tier = classifySelector(sel);

    const wBase = tier === null ? 0 : tier === 'head' ? 42 : tier === 'sub' ? 34 : 30;

    for (const part of splitFontStack(m[1])) {
      const tok = normalizeFontFamilyToken(part);
      if (!tok) continue;
      if (tier) bumpTier(part, tier, wBase);
      else bumpWeak(part, 4);
    }
  }
}

function bumpFontFaces(css: string, bumpTier: TierBump): void {
  const stripped = stripCssComments(css);
  for (const mm of stripped.matchAll(/@font-face\s*{([^}]*)}/gi)) {
    const inner = mm[1] ?? '';
    const fm = /font-family\s*:\s*([^;}]+)/i.exec(inner);
    if (!fm) continue;
    for (const part of splitFontStack(fm[1])) bumpTier(part, 'sub', 18);
  }
}

function extractGoogleFamiliesWeighted(href: string, bumpTier: TierBump): void {
  try {
    const u = new URL(href);
    if (!u.hostname.toLowerCase().includes('fonts.googleapis.')) return;
    const families = u.searchParams.getAll('family');
    const weights = [55, 40, 32] as const;
    for (let i = 0; i < families.length; i++) {
      const name = families[i]?.split(':')[0]?.trim().replace(/\+/g, ' ');
      if (!name) continue;
      const tier = i === 0 ? ('head' as TierKey) : i === 1 ? ('sub' as TierKey) : ('body' as TierKey);
      bumpTier(name, tier, weights[Math.min(i, 2)] ?? 26);
    }
  } catch {
    /* ignoré */
  }
}

/** Choisit au plus trois familles différentes, priorité titres > sous-titres > corps, puis fallback. */
function pickSiteSuggestions(model: ReturnType<typeof makeTierModel>): SiteFontSuggestion[] {
  const { canon, tiers, weakGlobal } = model;

  function bestOf(map: Map<string, number>, used: Set<string>): string | null {
    let bestKey: string | null = null;
    let bestW = -1;
    for (const [key, score] of map) {
      if (used.has(key)) continue;
      if (score > bestW || (score === bestW && bestKey !== null && key.localeCompare(bestKey) < 0)) {
        bestW = score;
        bestKey = key;
      }
    }
    return bestKey;
  }

  const used = new Set<string>();
  const out: SiteFontSuggestion[] = [];

  const roleLabels: Record<TierKey, string> = {
    head: 'Titres',
    sub: 'Sous-titres',
    body: 'Texte courant',
  };

  const orderKeys: TierKey[] = ['head', 'sub', 'body'];

  for (const tier of orderKeys) {
    if (out.length >= MAX_SITE_SUGGESTIONS) break;
    const k = bestOf(tiers[tier], used);
    if (!k) continue;
    used.add(k);
    out.push({ family: canon.get(k)!, role: roleLabels[tier] });
  }

  if (out.length >= MAX_SITE_SUGGESTIONS) return out;

  const mergedScores = new Map<string, number>();
  for (const [k, w] of weakGlobal) mergedScores.set(k, (mergedScores.get(k) ?? 0) + w);
  for (const tier of orderKeys) {
    for (const [k, w] of tiers[tier]) {
      mergedScores.set(k, (mergedScores.get(k) ?? 0) + w);
    }
  }

  while (out.length < MAX_SITE_SUGGESTIONS) {
    let bestKey: string | null = null;
    let bestW = -1;
    for (const [key, score] of mergedScores) {
      if (used.has(key)) continue;
      if (score > bestW) {
        bestW = score;
        bestKey = key;
      }
    }
    if (!bestKey) break;
    used.add(bestKey);
    const role = classifySecondaryRole(bestKey, tiers);
    out.push({ family: canon.get(bestKey)!, role });
  }

  return out.slice(0, MAX_SITE_SUGGESTIONS);
}

function classifySecondaryRole(
  key: string,
  tiers: Record<TierKey, Map<string, number>>,
): string {
  const order: TierKey[] = ['head', 'sub', 'body'];
  let bestTier: TierKey = 'body';
  let best = -1;
  for (const t of order) {
    const s = tiers[t].get(key) ?? -1;
    if (s > best) {
      best = s;
      bestTier = t;
    }
  }
  if (best <= 0) return 'Récurrent sur la page';
  return bestTier === 'head' ? 'Titres (secondaire)' : bestTier === 'sub' ? 'Sous-titres' : 'Texte courant';
}

function discoverStylesheetHrefs(html: string, pageUrl: URL): string[] {
  const out: string[] = [];
  for (const mm of html.matchAll(/<link[^>]*>/gi)) {
    const tag = mm[0];
    if (!/rel\s*=\s*["']?\s*stylesheet/i.test(tag)) continue;
    const hm = /\bhref\s*=\s*["']([^"']+)["']/i.exec(tag);
    if (!hm) continue;
    try {
      out.push(new URL(hm[1], pageUrl).href);
    } catch {
      /* skip */
    }
  }
  return [...new Set(out)].slice(0, 14);
}

function importsFromCss(css: string, base: URL): string[] {
  const urls: string[] = [];
  for (const mm of css.matchAll(/@import\s+(?:url\s*\(\s*)?["']?([^"');\s]+)/gi)) {
    try {
      urls.push(new URL(mm[1], base).href);
    } catch {
      /* skip */
    }
  }
  return urls.slice(0, 8);
}

async function fetchCssLimited(
  urlStr: string,
  parentSignal: AbortSignal,
  timeoutMs: number,
): Promise<string> {
  assertFetchablePublicUrl(urlStr);
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  const onParent = () => ac.abort();
  parentSignal.addEventListener('abort', onParent);
  try {
    const res = await fetch(urlStr, {
      redirect: 'follow',
      signal: ac.signal,
      headers: {
        'User-Agent': UA,
        Accept: 'text/css,*/*',
      },
    });
    if (!res.ok) return '';
    return (await res.text()).slice(0, 120_000);
  } catch {
    return '';
  } finally {
    clearTimeout(t);
    parentSignal.removeEventListener('abort', onParent);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return json(405, { error: 'Method not allowed' });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseAnon) {
      return json(500, { error: 'Configuration Supabase manquante' });
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return json(401, { error: 'Connexion requise' });
    }

    let body: { url?: unknown };
    try {
      body = await req.json();
    } catch {
      return json(400, { error: 'Corps JSON attendu' });
    }

    const rawUrl = typeof body.url === 'string' ? body.url : '';
    if (!rawUrl.trim()) {
      return json(400, { error: 'URL requise' });
    }

    const normalizedForFetch = rawUrl.trim().startsWith('http')
      ? rawUrl.trim()
      : `https://${rawUrl.trim()}`;

    const pageUrl = assertFetchablePublicUrl(normalizedForFetch);

    const controller = new AbortController();
    const timeoutMain = setTimeout(() => controller.abort(), 14000);

    let htmlSlice: string;
    try {
      const res = await fetch(normalizedForFetch, {
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': UA,
          Accept: 'text/html,application/xhtml+xml,*/*',
        },
      });
      clearTimeout(timeoutMain);
      if (!res.ok) {
        return json(422, { error: `Le site a répondu ${res.status}` });
      }
      htmlSlice = (await res.text()).slice(0, 520_000);
    } catch (e) {
      clearTimeout(timeoutMain);
      if (e instanceof Error && e.name === 'AbortError') {
        return json(504, { error: 'Temps imparti dépassé pour charger la page' });
      }
      return json(422, { error: 'Impossible de récupérer la page web' });
    }

    const model = makeTierModel();
    const { bumpTier, bumpWeak } = model;

    extractHeadingInlineFonts(htmlSlice, bumpTier);
    extractSubtitleInlineFonts(htmlSlice, bumpTier);
    extractBodyInlineFonts(htmlSlice, bumpTier);

    for (const mm of [...htmlSlice.matchAll(/<link[^>]*>/gi)]) {
      const uh = /\bhref\s*=\s*["']([^"']+)["']/i.exec(mm[0]);
      if (!uh?.[1]) continue;
      try {
        extractGoogleFamiliesWeighted(new URL(uh[1], pageUrl).href, bumpTier);
      } catch {
        /* ignoré */
      }
    }

    iterateFontFamiliesWithSelectors(htmlSlice, bumpTier, bumpWeak);
    bumpFontFaces(htmlSlice, bumpTier);

    for (const m of htmlSlice.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
      const blob = m[1] ?? '';
      iterateFontFamiliesWithSelectors(blob, bumpTier, bumpWeak);
      bumpFontFaces(blob, bumpTier);
    }

    const perCssTimeoutMs = 9000;
    let fetchBudget = 22;

    async function ingestCss(css: string, baseForImports: URL, depth: number): Promise<void> {
      if (!css.trim() || depth > 5 || fetchBudget <= 0) return;
      iterateFontFamiliesWithSelectors(css, bumpTier, bumpWeak);
      bumpFontFaces(css, bumpTier);

      const imports = importsFromCss(css, baseForImports);
      for (const imp of imports) {
        if (fetchBudget <= 0) break;
        try {
          const u = assertFetchablePublicUrl(imp);
          const sub = await fetchCssLimited(u.href, controller.signal, perCssTimeoutMs);
          fetchBudget--;
          if (sub) await ingestCss(sub, u, depth + 1);
        } catch {
          /* ignoré */
        }
      }
    }

    const sheetHrefs = discoverStylesheetHrefs(htmlSlice, pageUrl);
    for (const href of sheetHrefs) {
      if (fetchBudget <= 0) break;
      try {
        const u = assertFetchablePublicUrl(href);
        const cssBody = await fetchCssLimited(u.href, controller.signal, perCssTimeoutMs);
        fetchBudget--;
        if (cssBody) await ingestCss(cssBody, u, 1);
      } catch {
        /* ignoré */
      }
    }

    const suggestions = pickSiteSuggestions(model);

    return json(200, { fonts: suggestions });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne';
    return json(400, { error: message });
  }
});
