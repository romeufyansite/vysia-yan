/** Bloque SSRF évident pour les URLs récupérées depuis l’Edge. */
export function assertFetchablePublicUrl(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    throw new Error('URL invalide');
  }
  if (u.username || u.password) throw new Error('URL non autorisée');
  if (u.protocol !== 'https:' && u.protocol !== 'http:') {
    throw new Error('Schéma non autorisé');
  }

  const host = u.hostname.toLowerCase();

  if (host === 'localhost' || host.endsWith('.localhost')) {
    throw new Error('URL non autorisée');
  }
  if (host === '127.0.0.1' || /^127\.\d+\.\d+\.\d+$/.test(host)) {
    throw new Error('URL non autorisée');
  }
  if (host === '[::1]' || host === '::1') {
    throw new Error('URL non autorisée');
  }
  if (host.startsWith('192.168.') || host.startsWith('10.') || host === '0.0.0.0') {
    throw new Error('URL non autorisée');
  }
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
    throw new Error('URL non autorisée');
  }
  if (host.startsWith('169.254.')) {
    throw new Error('URL non autorisée');
  }
  if (host.endsWith('.onion')) {
    throw new Error('URL non autorisée');
  }

  return u;
}
