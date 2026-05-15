/** Fetch public HTML and reduce to plain text for LLM context (length-limited). */

import { assertFetchablePublicUrl } from './assertFetchablePublicUrl.ts';

const MAX_BYTES = 450_000;
const MAX_CHARS = 14_000;

function decodeBasicEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isFinite(code) && code > 0 ? String.fromCharCode(code) : '';
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      const code = parseInt(h, 16);
      return Number.isFinite(code) ? String.fromCharCode(code) : '';
    });
}

export function htmlToPlainText(html: string): string {
  let t = html.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  t = t.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  t = t.replace(/<!--[\s\S]*?-->/g, ' ');
  t = t.replace(/<[^>]+>/g, ' ');
  t = decodeBasicEntities(t);
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

export async function fetchWebsitePlainText(urlStr: string): Promise<{ url: string; text: string }> {
  const u = assertFetchablePublicUrl(urlStr);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 18_000);
  try {
    const res = await fetch(u.toString(), {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'VysiaOrgDescriptionBot/1.0',
      },
    });
    if (!res.ok) {
      throw new Error(`fetch_failed_${res.status}`);
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      throw new Error('page_too_large');
    }
    const html = new TextDecoder('utf-8', { fatal: false }).decode(buf);
    const text = htmlToPlainText(html).slice(0, MAX_CHARS);
    if (text.length < 80) {
      throw new Error('extracted_text_too_short');
    }
    return { url: u.toString(), text };
  } finally {
    clearTimeout(timer);
  }
}
