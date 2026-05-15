import { supabase } from '@/lib/supabase';

const EXTRACT_FONT_FN = '/functions/v1/extract-website-fonts';

export interface WebsiteFontSuggestion {
  family: string;
  /** Rôle typographique probable (titres, sous-titres, corps…) */
  role: string;
}

function fontsEndpoint(): string {
  if (import.meta.env.DEV) return EXTRACT_FONT_FN;
  return `${(import.meta.env.VITE_SUPABASE_URL as string).replace(/\/$/, '')}${EXTRACT_FONT_FN}`;
}

function notFoundHelp(rawBody: string): string {
  const looksLikeHtml = /<!DOCTYPE\s+html|<\s*html[\s>]/i.test(rawBody);
  if (import.meta.env.DEV && looksLikeHtml) {
    return 'Route /functions/v1 introuvable (proxy ou fonction non servie). Vérifiez VITE_SUPABASE_URL puis redémarrez le serveur de dev.';
  }
  const extra =
    import.meta.env.DEV
      ? ' En local : utilisez aussi VITE_DEV_EDGE_FUNCTIONS_ORIGIN + npm run functions:serve:extract-colors si besoin.'
      : '';
  return (
    `Fonction Edge « extract-website-fonts » introuvable (404). Déployez-la : npm run deploy:function:extract-fonts.${extra}`
  );
}

function parseSuggestionsPayload(fonts: unknown): WebsiteFontSuggestion[] {
  if (!Array.isArray(fonts)) return [];
  const out: WebsiteFontSuggestion[] = [];
  for (const item of fonts) {
    if (typeof item === 'string' && item.trim()) {
      out.push({ family: item.trim(), role: 'Typographie du site' });
      continue;
    }
    if (item && typeof item === 'object' && 'family' in item && typeof (item as { family: unknown }).family === 'string') {
      const fam = ((item as { family: string }).family).trim();
      if (!fam) continue;
      const roleRaw = (item as { role?: unknown }).role;
      const role = typeof roleRaw === 'string' && roleRaw.trim() ? roleRaw.trim() : 'Typographie du site';
      out.push({ family: fam, role });
    }
  }
  return out.slice(0, 3);
}

export async function fetchWebsiteFontSuggestions(siteUrl: string): Promise<WebsiteFontSuggestion[]> {
  const trimmed = siteUrl.trim();
  if (!trimmed) return [];

  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const { data: sess } = await supabase.auth.getSession();
  const jwt = sess.session?.access_token;

  try {
    const res = await fetch(fontsEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anon,
        ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      },
      body: JSON.stringify({
        url:
          trimmed.startsWith('http://') || trimmed.startsWith('https://')
            ? trimmed
            : `https://${trimmed}`,
      }),
    });

    const rawText = await res.text();
    let parsed: unknown;
    try {
      parsed = rawText ? JSON.parse(rawText) : {};
    } catch {
      parsed = {};
    }

    const data = parsed && typeof parsed === 'object' ? (parsed as { fonts?: unknown; error?: unknown }) : {};

    if (!res.ok) {
      if (res.status === 404) throw new Error(notFoundHelp(rawText));
      const errMsg =
        typeof data.error === 'string' ? data.error : `Réponse HTTP ${res.status}`;
      throw new Error(errMsg);
    }
    if ('error' in data && typeof data.error === 'string') {
      throw new Error(data.error);
    }

    return parseSuggestionsPayload(data.fonts);
  } catch (e) {
    const rawMsg = e instanceof Error ? e.message : String(e);
    const isConnectivityIssue =
      (e instanceof TypeError && /fail|fetch|network/i.test(rawMsg)) ||
      /failed to fetch|cors/i.test(rawMsg);

    if (isConnectivityIssue) {
      console.error('[fetchWebsiteFontSuggestions]', e);
      throw new Error(
        import.meta.env.DEV
          ? 'Connexion au détecteur de polices impossible. Redémarrez Vite après config du proxy.'
          : 'Connexion au détecteur de polices impossible. Déployez la fonction avec npm run deploy:function:extract-fonts.',
      );
    }
    console.error('[fetchWebsiteFontSuggestions]', e);
    throw new Error(rawMsg.trim() ? rawMsg : 'Impossible d’analyser les polices du site');
  }
}
