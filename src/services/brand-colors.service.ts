import { supabase } from '@/lib/supabase';

const EXTRACT_WEBSITE_FN = '/functions/v1/extract-website-colors';

function extractColorsEndpoint(): string {
  if (import.meta.env.DEV) {
    return EXTRACT_WEBSITE_FN;
  }
  const base = (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/$/, '');
  return `${base}${EXTRACT_WEBSITE_FN}`;
}

function notFoundHelpMessage(rawBody: string): string {
  const looksLikeHtml = /<!DOCTYPE\s+html|<\s*html[\s>]/i.test(rawBody);
  if (import.meta.env.DEV && looksLikeHtml) {
    return 'Route /functions/v1 introuvable sur le serveur de dev (proxy Vite ou cible Supabase incorrects). Vérifiez VITE_SUPABASE_URL et redémarrez npm run dev.';
  }
  const local =
    import.meta.env.DEV
      ? ' En local sans déploiement : dans .env ajoutez VITE_DEV_EDGE_FUNCTIONS_ORIGIN=http://127.0.0.1:54321, copiez supabase/functions/.env.example vers supabase/functions/.env, puis lancez npm run functions:serve:extract-colors (Docker requis) avant npm run dev.'
      : '';
  return (
    'La fonction Edge « extract-website-colors » répond 404 sur ce projet Supabase. Déployez-la (compte avec droits projet) : npm run deploy:function:extract-colors' +
    local
  );
}

export async function fetchWebsiteBrandColorSuggestions(url: string): Promise<string[]> {
  const trimmed = url.trim();
  if (!trimmed) return [];

  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const { data: sess } = await supabase.auth.getSession();
  const jwt = sess.session?.access_token;

  try {
    const res = await fetch(extractColorsEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anon,
        ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      },
      body: JSON.stringify({
        url: trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`,
      }),
    });

    const rawText = await res.text();
    let parsed: unknown;
    try {
      parsed = rawText ? JSON.parse(rawText) : {};
    } catch {
      parsed = {};
    }

    const data = parsed && typeof parsed === 'object' ? (parsed as { colors?: unknown; error?: unknown }) : {};

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(notFoundHelpMessage(rawText));
      }
      const errMsg = typeof data.error === 'string' ? data.error : `Réponse HTTP ${res.status}`;
      throw new Error(errMsg);
    }
    if ('error' in data && typeof data.error === 'string') {
      throw new Error(data.error);
    }

    const colors = data.colors;
    return Array.isArray(colors) ? (colors.filter((c): c is string => typeof c === 'string') as string[]) : [];
  } catch (e) {
    const rawMsg = e instanceof Error ? e.message : String(e);
    const isConnectivityIssue =
      (e instanceof TypeError && /fail|fetch|network/i.test(rawMsg)) ||
      /failed to fetch|failed to send|networkerror|cors/i.test(rawMsg);

    if (isConnectivityIssue) {
      console.error('[fetchWebsiteBrandColorSuggestions]', e);
      throw new Error(
        import.meta.env.DEV
          ? 'Connexion au service d’analyse impossible. Redémarrez le serveur de dev après la mise à jour de Vite (proxy vers Supabase).'
          : 'Connexion au service d’analyse impossible. Déployez la fonction avec : npm run deploy:function:extract-colors (ou `supabase functions deploy … --no-verify-jwt`).',
      );
    }

    console.error('[fetchWebsiteBrandColorSuggestions]', e);
    throw new Error(rawMsg.trim() ? rawMsg : "Impossible d'analyser le site web");
  }
}
