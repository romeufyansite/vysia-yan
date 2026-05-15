/** Première famille dans une pile CSS (`'DM Sans', sans-serif` → DM Sans). */
export function extractPrimaryFamilyFromStack(stack: string): string | null {
  const t = stack.trim();
  if (!t) return null;
  const mQuoted = t.match(/^['"]([^'"]+)['"]\s*,/);
  if (mQuoted) return mQuoted[1].trim();
  const mQuotedOnly = t.match(/^['"]([^'"]+)['"]\s*$/);
  if (mQuotedOnly) return mQuotedOnly[1].trim();
  const beforeComma = t.split(',')[0]?.trim().replace(/^['"]|['"]$/g, '');
  return beforeComma || null;
}
