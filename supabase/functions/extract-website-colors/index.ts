import { createClient } from 'npm:@supabase/supabase-js@2.58.0';
import { assertFetchablePublicUrl } from '../_shared/assertFetchablePublicUrl.ts';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  /** Lowercase list matches what browsers send in Access-Control-Request-Headers */
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, prefer, accept',
};

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function clamp255(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) => clamp255(n).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

function normalizeCssHex(hex: string): string | null {
  let h = hex.trim();
  if (h.startsWith('#')) h = h.slice(1);
  if (h.length === 3) {
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`.toUpperCase();
  }
  if (h.length === 6 && /^[0-9a-fA-F]{6}$/.test(h)) {
    return `#${h.toUpperCase()}`;
  }
  return null;
}

function parseThemeColor(html: string): string | null {
  const a = html.match(
    /<meta[^>]+name\s*=\s*["']theme-color["'][^>]+content\s*=\s*["']([^"']+)["']/i,
  );
  const b = html.match(
    /<meta[^>]+content\s*=\s*["']([^"']+)["'][^>]+name\s*=\s*["']theme-color["']/i,
  );
  const raw = a?.[1] ?? b?.[1];
  if (!raw) return null;
  const t = raw.trim();
  if (t.startsWith('#')) return normalizeCssHex(t);
  if (/^[0-9a-fA-F]{3,6}$/.test(t)) return normalizeCssHex(`#${t}`);
  return null;
}

function parseRgbChunk(r: number, g: number, b: number): string {
  return rgbToHex(r, g, b);
}

function isBoringNeutral(hex: string): boolean {
  const n = hex.slice(1);
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const spread = max - min;
  const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

  const boringWhites =
    /^#(F){6}$|^#F[EF]{5}$|^#E[E-F]{5}$|^#FFF[F]?$|^#FFFFFF$/i.test(hex) ||
    (spread < 22 && l > 0.9);
  const boringDark = /^#00000[0-3]?$/i.test(hex) || (spread < 15 && l < 0.08);
  return boringWhites || boringDark;
}

function saturationScore(hex: string): number {
  const n = hex.slice(1);
  const r = parseInt(n.slice(0, 2), 16) / 255;
  const g = parseInt(n.slice(2, 4), 16) / 255;
  const b = parseInt(n.slice(4, 6), 16) / 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  if (mx === 0) return 0;
  return (mx - mn) / mx;
}

function extractColorsFromHtml(html: string, maxColors: number): string[] {
  const weights = new Map<string, number>();
  let themeBonus = '';

  const themeMatch = parseThemeColor(html);
  if (themeMatch && !isBoringNeutral(themeMatch)) themeBonus = themeMatch;

  const hexRe = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
  for (const m of html.matchAll(hexRe)) {
    const nh = normalizeCssHex(m[0]);
    if (!nh || isBoringNeutral(nh)) continue;
    weights.set(nh, (weights.get(nh) ?? 0) + 1);
  }

  const rgbRe = /rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/gi;
  for (const m of html.matchAll(rgbRe)) {
    const r = Number(m[1]);
    const g = Number(m[2]);
    const b = Number(m[3]);
    if ([r, g, b].some((x) => x > 255 || x < 0)) continue;
    const nh = parseRgbChunk(r, g, b);
    if (isBoringNeutral(nh)) continue;
    weights.set(nh, (weights.get(nh) ?? 0) + 2);
  }

  if (themeBonus && weights.has(themeBonus)) {
    weights.set(themeBonus, (weights.get(themeBonus) ?? 0) + 12);
  } else if (themeBonus) {
    weights.set(themeBonus, (weights.get(themeBonus) ?? 0) + 10);
  }

  const ranked = [...weights.entries()]
    .map(([hex, w]) => ({
      hex,
      w: w * (1 + saturationScore(hex) * 3),
    }))
    .sort((a, b) => b.w - a.w);

  const palette: string[] = [];
  const minDistSq = 40 * 40;

  function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const n = hex.slice(1);
    return {
      r: parseInt(n.slice(0, 2), 16),
      g: parseInt(n.slice(2, 4), 16),
      b: parseInt(n.slice(4, 6), 16),
    };
  }

  function distSq(a: string, b: string): number {
    const A = hexToRgb(a);
    const B = hexToRgb(b);
    return (A.r - B.r) ** 2 + (A.g - B.g) ** 2 + (A.b - B.b) ** 2;
  }

  for (const { hex } of ranked) {
    if (palette.every((p) => distSq(p, hex) >= minDistSq)) {
      palette.push(hex);
    }
    if (palette.length >= maxColors) break;
  }

  return palette;
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

    assertFetchablePublicUrl(normalizedForFetch);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    let text: string;
    try {
      const res = await fetch(normalizedForFetch, {
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': 'VysiaBrandBot/1.0 (+https://vysia.app)',
          Accept: 'text/html,application/xhtml+xml',
        },
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return json(422, { error: `Le site a répondu ${res.status}` });
      }

      const ct = res.headers.get('content-type') ?? '';
      if (!ct.includes('text/html') && !ct.includes('application/xhtml+xml')) {
        text = await res.text().then((t) => t.slice(0, 520_000));
      } else {
        text = (await res.text()).slice(0, 520_000);
      }
    } catch (e) {
      clearTimeout(timeoutId);
      if (e instanceof Error && e.name === 'AbortError') {
        return json(504, { error: 'Temps imparti dépassé pour charger le site' });
      }
      return json(422, { error: 'Impossible de récupérer la page web' });
    }

    const colors = extractColorsFromHtml(text, 8);
    return json(200, { colors });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne';
    return json(400, { error: message });
  }
});
