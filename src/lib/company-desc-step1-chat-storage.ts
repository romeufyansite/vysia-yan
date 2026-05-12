/** Persistance locale du fil du chat — étape 1 description (par entreprise). */

export interface StoredDescStep1Turn {
  role: 'user' | 'assistant';
  content: string;
}

export interface CompanyDescStep1Persisted {
  messages: StoredDescStep1Turn[];
  /** Contexte crawl site lorsque la génération auto était insuffisante — envoyé aux tours suivants. */
  websiteFollowupSiteContext: string | null;
}

const storageKey = (orgId: string) => `vysia:company-desc-step1-chat:${orgId}`;

function normalizeFollowUp(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  return t.length > 0 ? t : null;
}

/** Charge messages + contexte « suite site » (migration depuis le format v1). */
export function loadCompanyDescStep1Bundle(orgId: string): CompanyDescStep1Persisted {
  if (!orgId || typeof localStorage === 'undefined') {
    return { messages: [], websiteFollowupSiteContext: null };
  }
  try {
    const raw = localStorage.getItem(storageKey(orgId));
    if (!raw) return { messages: [], websiteFollowupSiteContext: null };
    const parsed = JSON.parse(raw) as {
      v?: number;
      messages?: StoredDescStep1Turn[];
      websiteFollowupSiteContext?: unknown;
    };
    const msgs = Array.isArray(parsed.messages)
      ? parsed.messages.filter(
          (m) =>
            m &&
            (m.role === 'user' || m.role === 'assistant') &&
            typeof m.content === 'string' &&
            m.content.trim().length > 0,
        )
      : [];
    const ctx =
      parsed.v === 2 ? normalizeFollowUp(parsed.websiteFollowupSiteContext) : null;
    return { messages: msgs, websiteFollowupSiteContext: ctx };
  } catch {
    return { messages: [], websiteFollowupSiteContext: null };
  }
}

/** @deprecated Préférer loadCompanyDescStep1Bundle */
export function loadCompanyDescStep1Chat(orgId: string): StoredDescStep1Turn[] {
  return loadCompanyDescStep1Bundle(orgId).messages;
}

export function saveCompanyDescStep1Bundle(orgId: string, bundle: CompanyDescStep1Persisted): void {
  if (!orgId || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(
      storageKey(orgId),
      JSON.stringify({
        v: 2,
        messages: bundle.messages,
        websiteFollowupSiteContext: bundle.websiteFollowupSiteContext ?? null,
      }),
    );
  } catch {
    /* quota / navigation privée */
  }
}

/** @deprecated Préférer saveCompanyDescStep1Bundle — conserve sans contexte site */
export function saveCompanyDescStep1Chat(orgId: string, messages: StoredDescStep1Turn[]): void {
  saveCompanyDescStep1Bundle(orgId, { messages, websiteFollowupSiteContext: null });
}

export function clearCompanyDescStep1Chat(orgId: string): void {
  if (!orgId || typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(storageKey(orgId));
  } catch {
    /* ignore */
  }
}
