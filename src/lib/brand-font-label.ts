/** Propose une stack CSS lisible (`name` peut contenir espaces sans guillemets). */
export function cssFamilyStackFromName(nameOrStack: string): string {
  const t = nameOrStack.trim();
  if (!t) return 'sans-serif';
  if (/,\s*/.test(t)) return t;
  const escaped = t.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `'${escaped}', sans-serif`;
}

/** Évite deux polices avec le même libellé affiché. */
export function allocateFontDisplayName(existingLowerNames: Set<string>, baseName: string): string {
  const cleaned = baseName.trim();
  const keyRoot = cleaned.toLowerCase();
  if (!keyRoot) return 'Police';
  if (!existingLowerNames.has(keyRoot)) return cleaned || 'Police';

  let i = 2;
  while (existingLowerNames.has(`${keyRoot} ${i}`)) i += 1;
  return `${cleaned} ${i}`;
}
