/** Hôte acceptable pour un site public (évite https://non/, https://oui/, etc.). */
function isPlausibleWebsiteHost(hostname: string): boolean {
  const h = hostname.replace(/\.$/, '').toLowerCase();
  if (h === 'localhost') return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return true;
  return h.includes('.');
}

/** Normalise une URL de site public (http/https). Retourne null si invalide ou hôte non plausible. */
export function normalizeWebsiteUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const u = /^https?:\/\//i.test(t) ? new URL(t) : new URL(`https://${t}`);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (!isPlausibleWebsiteHost(u.hostname)) return null;
    return u.href;
  } catch {
    return null;
  }
}

/** Limite les faux positifs type « … création de site Web … » dans de longs paragraphes. */
const MAX_LENGTH_FOR_DOMAIN_HEURISTIC = 280;

/** Extrait une URL plausible dans un message utilisateur (phrase ou lien seul). */
export function extractWebsiteUrlFromText(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  const direct = normalizeWebsiteUrl(t);
  if (direct) return direct;
  const httpsMatch = t.match(/https?:\/\/[^\s<>"')]+/i);
  if (httpsMatch) return normalizeWebsiteUrl(httpsMatch[0]);
  if (t.length > MAX_LENGTH_FOR_DOMAIN_HEURISTIC) return null;
  const domainLike = t.match(
    /\b(?:www\.)?(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s<>"')]*)?\b/i,
  );
  if (domainLike) return normalizeWebsiteUrl(domainLike[0]);
  return null;
}
