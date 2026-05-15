import { createClient } from 'npm:@supabase/supabase-js@2.58.0';
import { fetchWebsitePlainText } from '../_shared/fetchWebsitePlainText.ts';
import { deepSeekChatCompletion, loadDeepSeekV4FlashRuntime } from '../_shared/platformDeepSeekFlash.ts';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, prefer, accept',
};

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function ok(body: Record<string, unknown>): Response {
  return json(200, { ok: true, ...body });
}

function fail(error: string): Response {
  return json(200, { ok: false, error });
}

function stripJsonFence(raw: string): string {
  let s = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(s);
  if (fence?.[1]) s = fence[1].trim();
  return s;
}

/** Extrait le premier objet JSON `{ ... }` équilibré (ignore le texte avant/après). */
function extractBalancedJsonObject(raw: string): string | null {
  const s = raw.trim();
  const start = s.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (c === '\\') {
        escape = true;
        continue;
      }
      if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

function parseStep1AssistantPayload(raw: string): Record<string, unknown> | null {
  const chunks = new Set<string>();
  chunks.add(stripJsonFence(raw));
  const extracted = extractBalancedJsonObject(raw);
  if (extracted) chunks.add(extracted);
  const fencedInner = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(raw.trim());
  if (fencedInner?.[1]) {
    const inner = fencedInner[1].trim();
    chunks.add(inner);
    const innerBal = extractBalancedJsonObject(inner);
    if (innerBal) chunks.add(innerBal);
  }
  for (const chunk of chunks) {
    if (!chunk.trim()) continue;
    try {
      const o = JSON.parse(chunk) as Record<string, unknown>;
      if (o && typeof o === 'object' && !Array.isArray(o)) return o;
    } catch {
      /* suivant */
    }
  }
  return null;
}

function parsePrefillAssessmentPayload(raw: string): Record<string, unknown> | null {
  const chunks = new Set<string>();
  chunks.add(stripJsonFence(raw));
  const extracted = extractBalancedJsonObject(raw);
  if (extracted) chunks.add(extracted);
  const fencedInner = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(raw.trim());
  if (fencedInner?.[1]) {
    const inner = fencedInner[1].trim();
    chunks.add(inner);
    const innerBal = extractBalancedJsonObject(inner);
    if (innerBal) chunks.add(innerBal);
  }
  for (const chunk of chunks) {
    if (!chunk.trim()) continue;
    try {
      const o = JSON.parse(chunk) as Record<string, unknown>;
      if (o && typeof o === 'object' && !Array.isArray(o)) return o;
    } catch {
      /* suivant */
    }
  }
  return null;
}

const STEP1_BOOTSTRAP_USER =
  "L'utilisateur ouvre l'étape 1 « description de l'entreprise ». Réponds uniquement avec un objet JSON valide conforme à tes instructions système.";

/** Étape 1 : machine à états déterministe côté serveur ; ce prompt couvre seulement la conduite des questions et la rédaction finale. */
const STEP1_SYSTEM = `Tu es Lia, assistante IA de l'étape 1 « description d'entreprise » (français), pour supports digitaux.

Tu reçois une ligne CONTEXT_SITE indiquant si une URL est déjà enregistrée. Le serveur a déjà tranché les questions d’aiguillage (« avez-vous un site ? », choix site automatique vs questions). NE POSE JAMAIS la dichotomie « génération depuis le site vs questions » ; le serveur gère cela tout seul. NE DEMANDE PAS l’URL : si l’utilisateur a un site, le serveur transmet déjà le contexte qu’il faut.

Réponds toujours avec UN SEUL objet JSON UTF-8 valide, sans markdown, sans texte hors JSON. Une réponse = exactement un objet JSON.

Formes autorisées :

1) {"phase":"continue","message_for_user":"..."}
   — Une seule question courte (≤ 240 caractères) ou une relance ciblée, en français naturel.
   — Tu peux citer un détail déjà donné par l’utilisateur pour montrer que tu écoutes (« vous m’avez parlé de … : pouvez-vous préciser … ? »).
   — Une seule idée par message ; ne pose pas plusieurs questions à la fois.

2) {"phase":"announce_then_complete","message_for_user":"...","draft_description":"..."}
   — Utilise cette forme dès que tu as suffisamment de matière pour rédiger.
   — message_for_user : 1 à 2 phrases, naturel, remerciement + annonce que tu rédiges (sans recopier le brouillon ici).
   — draft_description : texte français autonome, 700 à 1400 caractères, fluide, sans superlatifs creux, sans « selon nos échanges », sans guillemets autour de citations utilisateur. Couvre activité, offres, clients, différenciation, contexte si donnés. N’invente pas de faits.

3) {"phase":"done","draft_description":"..."}
   — Variante de secours ; préfère toujours announce_then_complete.

Règles de fond :
- Tu mènes un véritable mini-entretien : tu écoutes vraiment, tu reformules implicitement, tu enchaînes sur un sujet « à creuser » différent de ceux déjà couverts.
- Le serveur t’indique l’état de couverture (activité, offres, clients, différenciation, géographie / contexte, valeurs / ton) et le prochain sujet à creuser quand c’est utile.
- Si l’utilisateur fournit déjà beaucoup d’informations en une fois (texte long et riche), tu peux passer directement à announce_then_complete.
- Quand il y a au moins 4 sujets couverts et 3 messages utilisateur substantiels, ou 6 messages utilisateur substantiels, tu DOIS produire announce_then_complete.

Style :
- Ton chaleureux, professionnel, sans emojis, sans formules creuses.
- Pas de listes numérotées dans message_for_user (sauf si l’utilisateur l’a demandé).
- Pas de « bonjour / bienvenue » après le premier tour.

Format de sortie : un seul objet JSON, sans markdown.`;

/** Détection FR : utilisateur valide la génération depuis le site. */
function userChoosesSiteBranch(text: string): boolean {
  const raw = text.trim();
  if (raw.length === 0 || raw.length > 800) return false;
  const t = raw.toLowerCase();

  if (/\bnon\b/.test(t) || /\bjamais\b/.test(t) || /\baucun\b/.test(t)) return false;
  if (/\bsans\s+(?:le|ce|mon|utiliser|crawler)/.test(t)) return false;
  if (/\bpas\s+(?:depuis|avec|au|via|à\s+partir)\s+(?:le|du|ce|mon|d['']un)?\s*site/.test(t)) return false;
  if (/\bquelques?\s+questions?\b/.test(t)) return false;
  if (/\bmanuel(?:le)?(?:ment)?\b/.test(t)) return false;
  if (/\br[eé]pondre[\s\S]{0,40}questions?/.test(t)) return false;
  if (/\bpr[eé]f[eè]r\w*[\s\S]{0,80}questions?/.test(t)) return false;

  if (/^(?:oui|ouais|yes|yep|ok|okay|d['']accord|dac|d[ac]\b|bien\s+s[uû]r|évidemment|tout\s+à\s+fait|exact(?:ement)?|parfait|allez[-\s]*y|vas[-\s]*y|c['']est\s+bon|ça\s+marche|carr[eé]ment)\b/.test(t)) {
    return true;
  }
  if (/\b(?:depuis|à\s+partir\s+de|avec|via|sur\s+la\s+base\s+de)\s+(?:ce|mon|notre|le)?\s*site\b/.test(t)) {
    return true;
  }
  if (/\b(?:utilise|emploie|sers[\s-]?toi|sers[\s-]?en|prends?|reprends?|exploite|crawle)\b[\s\S]*\bsite\b/.test(t)) {
    return true;
  }
  if (/\b(?:g[eé]n[eé]r\w+|r[eé]dige\w*|cr[eé]e\w*|fais\b|fait\s+la)\b[\s\S]*\b(?:site|automat\w*)\b/.test(t)) {
    return true;
  }
  if (/\b(?:option\s+1|premi[eè]re\s+(?:option|proposition|possibilit[eé]))/.test(t)) return true;
  if (/\bautomatiquement\b/.test(t)) return true;

  return false;
}

/** Détection FR : utilisateur préfère répondre aux questions / refuse le site. */
function userChoosesQuestionsBranch(text: string): boolean {
  const raw = text.trim();
  if (raw.length === 0 || raw.length > 1200) return false;
  const t = raw.toLowerCase();

  if (/^(?:non|nan|nope)\b/.test(t)) return true;
  if (/\bquelques?\s+questions?\b/.test(t)) return true;
  if (/\br[eé]pondre[\s\S]{0,40}questions?\b/.test(t)) return true;
  if (/\b(?:questions?\s+(?:seulement|uniquement|plut[oô]t))/.test(t)) return true;
  if (/\bmanuel(?:le)?(?:ment)?\b/.test(t)) return true;
  if (/\bsans\s+(?:le|ce|mon|utiliser|crawler|s['']appuyer\s+sur)\s*(?:le\s+)?site\b/.test(t)) return true;
  if (/\bpas\s+(?:depuis|avec|via|sur)\s+(?:le|ce|mon)?\s*site\b/.test(t)) return true;
  if (/\bpr[eé]f[eè]r\w*[\s\S]{0,80}questions?\b/.test(t)) return true;
  if (/\boption\s+2\b/.test(t) || /\bdeuxi[eè]me\s+(?:option|proposition)/.test(t)) return true;

  return false;
}

/** Détection FR : l'utilisateur affirme avoir un site. */
function userAffirmsHasSite(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (/^(?:oui|ouais|yes|yep|j['']ai|on\s+a|nous\s+avons|effectivement|tout\s+à\s+fait)\b/.test(t)) {
    return /\bsite\b/.test(t) || t.length <= 60;
  }
  return false;
}

/** Détection FR : l'utilisateur indique qu'il n'a pas de site. */
function userDeniesHasSite(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (/^(?:non|nan|nope|pas\s+(?:encore|du\s+tout))\b/.test(t) && t.length <= 160) {
    return true;
  }
  if (/\b(?:pas\s+de\s+site|aucun\s+site|sans\s+site|je\s+n['']ai\s+pas\s+de\s+site|on\s+n['']a\s+pas\s+de\s+site|nous\s+n['']avons\s+pas\s+de\s+site)\b/.test(t)) {
    return true;
  }
  return false;
}

/** Détection : le dernier message assistant pose la dichotomie site/questions. */
function assistantAskedDichotomy(text: string): boolean {
  const s = text.toLowerCase();
  if (!/\bsite\b/.test(s)) return false;
  if (!/\bquestions?\b/.test(s)) return false;
  const siteAuto =
    /\b(?:g[eé]n[eé]r\w+|r[eé]dige\w*|cr[eé]e\w*|automat\w*)\b[\s\S]{0,140}\bsite\b/.test(s) ||
    /\bsite\b[\s\S]{0,140}\b(?:g[eé]n[eé]r\w+|r[eé]dige\w*|cr[eé]e\w*|automat\w*)\b/.test(s) ||
    /(?:à|a)\s+partir\s+(?:de\s+)?(?:ce\s+|mon\s+|notre\s+|votre\s+)?site/.test(s) ||
    /depuis\s+(?:ce\s+|mon\s+|notre\s+|votre\s+)?site/.test(s);
  if (!siteAuto) return false;
  const questionsAlt =
    /(?:pr[eé]f[eè]r\w*|plut[oô]t|sinon|sans|ou)\s*[\s\S]{0,80}\bquestions?\b/.test(s) ||
    /\bquestions?[\s\S]{0,80}(?:sans|construire|r[eé]diger\s+sans|manuellement)/.test(s);
  return questionsAlt;
}

/** Détection : le dernier message assistant demande si l'utilisateur a un site. */
function assistantAskedHasSite(text: string): boolean {
  const s = text.toLowerCase();
  if (!/\bsite\b/.test(s)) return false;
  return /\b(?:avez[\s-]?vous|as[\s-]?tu|avez[\s-]?vous\s+un\s+site|disposez[\s-]?vous|avez[\s-]?vous\s+d['']un|y\s+a[\s-]?t[\s-]?il)\b/.test(s);
}

/** Détection : le dernier message assistant demande l'URL du site. */
function assistantAskedForUrl(text: string): boolean {
  const s = text.toLowerCase();
  return /\b(?:url|adresse|lien)\b[\s\S]{0,60}site/.test(s) || /\bsite\b[\s\S]{0,60}(?:url|adresse|lien)/.test(s);
}

const HTTP_URL_REGEX = /https?:\/\/[^\s<>"']+/i;
const BARE_DOMAIN_REGEX = /\b((?:[a-z0-9-]+\.)+[a-z]{2,})(?:\/[^\s]*)?\b/i;

function extractUrlFromUserText(text: string): string | null {
  const httpMatch = text.match(HTTP_URL_REGEX);
  if (httpMatch?.[0]) return httpMatch[0].replace(/[.,;)\]]+$/, '');
  const bareMatch = text.match(BARE_DOMAIN_REGEX);
  if (bareMatch?.[0]) {
    const candidate = bareMatch[0].replace(/[.,;)\]]+$/, '');
    if (candidate.includes('.') && !candidate.toLowerCase().match(/^(non|oui|merci|svp|stp)\./)) {
      return `https://${candidate}`;
    }
  }
  return null;
}

interface TopicCoverage {
  activity: boolean;
  offerings: boolean;
  clients: boolean;
  differentiation: boolean;
  geography: boolean;
  values_tone: boolean;
}

const TOPIC_PATTERNS: Record<keyof TopicCoverage, RegExp> = {
  activity:
    /\b(?:nous\s+(?:faisons|proposons|offrons|sommes)|on\s+(?:fait|propose|offre)|je\s+(?:fais|propose|offre|vends)|activit[eé]|m[eé]tier|sp[eé]cialis\w+|fabri\w+|produi\w+|vend\w+|service[s]?)\b/i,
  offerings:
    /\b(?:produit[s]?|service[s]?|offre[s]?|formule[s]?|abonnement[s]?|prestation[s]?|catalogue|gamme)\b/i,
  clients:
    /\b(?:client[s]?|particulier[s]?|professionnel[s]?|entreprise[s]?|cible[s]?|segment[s]?|b2b|b2c|march[eé]\w*|public)\b/i,
  differentiation:
    /\b(?:diff[eé]ren\w+|atout[s]?|avantage[s]?|expertise|qualit[eé]|unique|sp[eé]cifi\w+|prouv\w+|innov\w+|valeur\s+ajout[eé]e)\b/i,
  geography:
    /\b(?:r[eé]gion\w*|local\w*|national\w*|international\w*|monde|france|europe|paris|lyon|marseille|secteur\s+g[eé]ographique|implant\w+|filiale)\b/i,
  values_tone:
    /\b(?:valeur[s]?|ton\s+(?:de\s+)?marque|engagement|mission|vision|[eé]thique|responsabilit[eé]|durab\w+|humain\w*|chaleureu\w+|professionn\w+|s[eé]rieux|cr[eé]atif|inno\w+|fun)\b/i,
};

function computeTopicCoverage(userMessages: string[]): TopicCoverage {
  const joined = userMessages.join('\n').toLowerCase();
  return {
    activity: TOPIC_PATTERNS.activity.test(joined),
    offerings: TOPIC_PATTERNS.offerings.test(joined),
    clients: TOPIC_PATTERNS.clients.test(joined),
    differentiation: TOPIC_PATTERNS.differentiation.test(joined),
    geography: TOPIC_PATTERNS.geography.test(joined),
    values_tone: TOPIC_PATTERNS.values_tone.test(joined),
  };
}

interface QuestionFlowState {
  /** L'utilisateur a explicitement choisi la branche « questions » à un moment. */
  pickedQuestionsBranch: boolean;
  /** L'utilisateur a explicitement déclaré ne pas avoir de site. */
  declaredNoSite: boolean;
  /** L'utilisateur a accepté la génération depuis le site (au moins une fois). */
  acceptedSiteBranch: boolean;
  /** L'assistant a déjà posé la dichotomie au moins une fois (peu importe la formulation). */
  dichotomyAlreadyAsked: boolean;
  /** L'assistant a déjà demandé si l'utilisateur avait un site. */
  hasSiteAlreadyAsked: boolean;
  /** URL fournie par l'utilisateur pendant la conversation. */
  userProvidedUrl: string | null;
  /** Nombre total de messages utilisateur substantiels (hors bootstrap). */
  substantiveUserMessagesCount: number;
  /** Messages utilisateur substantiels (hors bootstrap, hors « oui/non » de la dichotomie). */
  substantiveUserMessages: string[];
}

function deriveFlowState(dialogue: ChatTurnMsg[]): QuestionFlowState {
  let pickedQuestionsBranch = false;
  let declaredNoSite = false;
  let acceptedSiteBranch = false;
  let dichotomyAlreadyAsked = false;
  let hasSiteAlreadyAsked = false;
  let userProvidedUrl: string | null = null;
  const substantiveUserMessages: string[] = [];

  for (let i = 0; i < dialogue.length; i++) {
    const m = dialogue[i];
    if (m.role === 'assistant') {
      if (assistantAskedDichotomy(m.content)) dichotomyAlreadyAsked = true;
      if (assistantAskedHasSite(m.content)) hasSiteAlreadyAsked = true;
      continue;
    }
    if (m.content === STEP1_BOOTSTRAP_USER) continue;

    const prevAssistant = (() => {
      for (let j = i - 1; j >= 0; j--) {
        if (dialogue[j].role === 'assistant') return dialogue[j].content;
      }
      return '';
    })();

    if (assistantAskedDichotomy(prevAssistant)) {
      if (userChoosesSiteBranch(m.content)) acceptedSiteBranch = true;
      if (userChoosesQuestionsBranch(m.content)) pickedQuestionsBranch = true;
    }
    if (assistantAskedHasSite(prevAssistant)) {
      if (userDeniesHasSite(m.content)) declaredNoSite = true;
    }

    const url = extractUrlFromUserText(m.content);
    if (url && !userProvidedUrl) userProvidedUrl = url;

    /** Réponses « techniques » au seul choix : ne pas compter comme matière métier. */
    const looksLikeDichotomyAnswer =
      assistantAskedDichotomy(prevAssistant) &&
      (userChoosesSiteBranch(m.content) || userChoosesQuestionsBranch(m.content)) &&
      m.content.trim().length <= 80;
    const looksLikeHasSiteAnswer =
      assistantAskedHasSite(prevAssistant) &&
      (userAffirmsHasSite(m.content) || userDeniesHasSite(m.content)) &&
      m.content.trim().length <= 80;

    if (!looksLikeDichotomyAnswer && !looksLikeHasSiteAnswer && m.content.trim().length >= 2) {
      substantiveUserMessages.push(m.content.trim());
    }
  }

  return {
    pickedQuestionsBranch,
    declaredNoSite,
    acceptedSiteBranch,
    dichotomyAlreadyAsked,
    hasSiteAlreadyAsked,
    userProvidedUrl,
    substantiveUserMessagesCount: substantiveUserMessages.length,
    substantiveUserMessages,
  };
}

const QUESTION_BANK: { key: keyof TopicCoverage; question: string }[] = [
  {
    key: 'activity',
    question:
      'Pour bien démarrer, pouvez-vous me décrire en quelques phrases l’activité principale de votre entreprise — ce que vous faites au quotidien et pour qui ?',
  },
  {
    key: 'offerings',
    question:
      'Quels sont vos produits, services ou offres clés ? Citez-en deux ou trois avec un mot pour chacun.',
  },
  {
    key: 'clients',
    question:
      'À quels types de clients vous adressez-vous principalement (particuliers, professionnels, secteurs, taille) ?',
  },
  {
    key: 'differentiation',
    question:
      'Qu’est-ce qui vous différencie de vos concurrents ou quel problème concret résolvez-vous mieux que les autres ?',
  },
  {
    key: 'geography',
    question:
      'Quelle est votre zone d’intervention ou votre contexte (local, régional, national, international) ?',
  },
  {
    key: 'values_tone',
    question:
      'Pour finir, quelles valeurs ou quel ton souhaitez-vous que votre communication reflète (sérieux, chaleureux, innovant, premium…) ?',
  },
];

function pickNextDeterministicQuestion(
  coverage: TopicCoverage,
  alreadyAskedAssistantText: string[],
): { key: keyof TopicCoverage; question: string } | null {
  for (const entry of QUESTION_BANK) {
    if (coverage[entry.key]) continue;
    const repeat = alreadyAskedAssistantText.some(
      (prev) => prev.trim().toLowerCase() === entry.question.trim().toLowerCase(),
    );
    if (repeat) continue;
    return entry;
  }
  return null;
}

type ChatTurnMsg = { role: 'user' | 'assistant'; content: string };

function sanitizeStep1Messages(raw: unknown): ChatTurnMsg[] {
  if (!Array.isArray(raw)) return [];
  const out: ChatTurnMsg[] = [];
  for (const item of raw.slice(-28)) {
    if (!item || typeof item !== 'object') continue;
    const role = (item as Record<string, unknown>).role;
    const content = String((item as Record<string, unknown>).content ?? '').trim();
    if (!content || (role !== 'user' && role !== 'assistant')) continue;
    const clipped = content.length > 12000 ? `${content.slice(0, 12000)}…` : content;
    out.push({ role: role as 'user' | 'assistant', content: clipped });
  }
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return fail('method_not_allowed');
  }

  const masterKeyHex = Deno.env.get('PLATFORM_LLM_MASTER_KEY_HEX')?.trim() ?? '';
  const normalizedMaster = masterKeyHex.replace(/^0x/i, '').toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalizedMaster)) {
    console.error('company-description-ai: PLATFORM_LLM_MASTER_KEY_HEX invalid');
    return fail('server_misconfigured');
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!jwt) {
      return fail('missing_authorization');
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: userResult } = await userClient.auth.getUser();
    const user = userResult?.user;
    if (!user) {
      return fail('unauthorized');
    }

    const body = (await req.json()) as Record<string, unknown>;
    const action = String(body.action ?? '').trim();
    const orgId = String(body.org_id ?? '').trim();

    if (!orgId) {
      return fail('org_id_required');
    }

    const { data: allowed, error: rpcErr } = await userClient.rpc('can_manage_org_company', {
      p_org_id: orgId,
    });
    if (rpcErr) {
      console.error('company-description-ai rpc', rpcErr);
      return fail('permission_check_failed');
    }
    if (!allowed) {
      return fail('forbidden');
    }

    let runtime;
    try {
      runtime = await loadDeepSeekV4FlashRuntime(admin, normalizedMaster);
    } catch (e) {
      const m = e instanceof Error ? e.message : '';
      if (m === 'deepseek_v4_flash_not_configured' || m === 'deepseek_secret_missing') {
        return fail('llm_not_configured');
      }
      throw e;
    }

    if (action === 'prefill_from_website') {
      const { data: org, error: orgErr } = await admin
        .from('orgs')
        .select('website')
        .eq('id', orgId)
        .maybeSingle();
      if (orgErr || !org) {
        return fail('org_not_found');
      }
      const websiteUrl = String(body.website_url ?? org.website ?? '').trim();
      if (!websiteUrl) {
        return fail('website_required');
      }

      let plain: string;
      try {
        const fetched = await fetchWebsitePlainText(websiteUrl);
        plain = fetched.text;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'fetch_failed';
        return fail(msg === 'fetch_failed' ? 'fetch_failed' : msg);
      }

      const PREFILL_ASSESSMENT_SYSTEM =
        'Tu évalues si une description d’entreprise fiable peut être rédigée à partir d’un extrait textuel public de site web. Tu réponds uniquement avec UN objet JSON UTF-8 valide, sans markdown ni texte hors JSON.';

      const assessmentPrompt =
        `URL : ${websiteUrl}\n\nExtrait textuel (tronqué) :\n${plain}\n\n` +
        'Décision :\n' +
        '- Si l’extrait permet une description métier solide et nuancée (vise environ 700 à 1400 caractères) sans inventions majeures, réponds exactement :\n' +
        '{"assessment":"sufficient","draft_description":"..."}\n\n' +
        '- Sinon (site très léger, boilerplate / légal / menus sans fond métier, informations trop floues), réponds exactement :\n' +
        '{"assessment":"insufficient","assistant_message":"...","site_notes_for_followup":"..."}\n\n' +
        'assistant_message : français ; 2 à 4 phrases ; tu expliques brièvement que le site ne suffit pas pour tout automatiser, puis tu poses UNE question très précise (activité concrète, clientèle ou valeur ajoutée).\n' +
        'site_notes_for_followup : français ; résumé factuel pour une IA (liste courte ou paragraphe dense), uniquement ce qui est identifiable dans l’extrait — aucune invention — maximum 900 caractères.\n' +
        'draft_description : plusieurs phrases fluides, sans « selon le site », sans URL.';

      const rawAssessment = await deepSeekChatCompletion({
        runtime,
        temperature: 0.35,
        max_tokens: 3800,
        messages: [
          { role: 'system', content: PREFILL_ASSESSMENT_SYSTEM },
          { role: 'user', content: assessmentPrompt },
        ],
      });

      const PREFILL_ASSESSMENT_REPAIR_USER =
        'Ta réponse n’était pas uniquement un objet JSON valide. Renvoie UN SEUL JSON parmi :\n' +
        '{"assessment":"sufficient","draft_description":"..."} OU\n' +
        '{"assessment":"insufficient","assistant_message":"...","site_notes_for_followup":"..."}\n' +
        'sans markdown ni phrase hors JSON.';

      let parsedPrefill = parsePrefillAssessmentPayload(rawAssessment);
      if (!parsedPrefill) {
        const clipped =
          rawAssessment.length > 4000 ? `${rawAssessment.slice(0, 4000)}…` : rawAssessment;
        const repairRaw = await deepSeekChatCompletion({
          runtime,
          temperature: 0.08,
          max_tokens: 2400,
          messages: [
            { role: 'system', content: PREFILL_ASSESSMENT_SYSTEM },
            { role: 'user', content: assessmentPrompt },
            { role: 'assistant', content: clipped },
            { role: 'user', content: PREFILL_ASSESSMENT_REPAIR_USER },
          ],
        });
        parsedPrefill = parsePrefillAssessmentPayload(repairRaw);
      }

      if (!parsedPrefill) {
        console.error('company-description-ai prefill json_parse', rawAssessment.slice(0, 600));
        return fail('ai_invalid_json');
      }

      const assessment = String(parsedPrefill.assessment ?? '').trim().toLowerCase();

      const insufficientFallbackNotes =
        `Site ${websiteUrl} — extrait crawlé peu exploitable pour une description auto complète.`;

      if (assessment === 'sufficient') {
        const draft = String(parsedPrefill.draft_description ?? '').trim();
        if (draft.length < 240) {
          return ok({
            outcome: 'needs_chat_followup',
            message_for_user:
              'Le contenu public du site est encore trop limité pour rédiger une description complète automatiquement. Pouvez-vous préciser votre activité principale et ce que vous proposez concrètement à vos clients ?',
            site_notes_for_followup: insufficientFallbackNotes,
          });
        }
        return ok({ outcome: 'complete', draft_description: draft });
      }

      if (assessment === 'insufficient') {
        const assistantMessage = String(parsedPrefill.assistant_message ?? '').trim();
        const siteNotes = String(parsedPrefill.site_notes_for_followup ?? '').trim().slice(0, 1100);
        if (!assistantMessage || assistantMessage.length < 24) {
          return ok({
            outcome: 'needs_chat_followup',
            message_for_user:
              'Le site ne permet pas d’extraire assez d’informations métier pour rédiger seule une description complète. Pouvez-vous décrire votre activité et vos principaux services ou produits ?',
            site_notes_for_followup: siteNotes || insufficientFallbackNotes,
          });
        }
        return ok({
          outcome: 'needs_chat_followup',
          message_for_user: assistantMessage,
          site_notes_for_followup: siteNotes || insufficientFallbackNotes,
        });
      }

      return fail('ai_invalid_json');
    }

    if (action === 'analyze_description') {
      const descriptionText = String(body.description_text ?? '').trim();
      if (descriptionText.length < 40) {
        return fail('description_too_short');
      }

      const raw = await deepSeekChatCompletion({
        runtime,
        temperature: 0.25,
        max_tokens: 3500,
        messages: [
          {
            role: 'system',
            content:
              'Tu es expert en identité de marque et direction artistique pour supports digitaux (affiches, écrans, réseaux). Tu réponds uniquement avec un objet JSON valide UTF-8, sans markdown ni texte avant ou après.',
          },
          {
            role: 'user',
            content:
              'À partir de la description entreprise ci-dessous, produis un objet JSON avec exactement cette structure (clés en anglais, valeurs en français sauf key_offerings et keywords_for_visuals qui peuvent mélanger termes courts si pertinent) :\n' +
              '{\n' +
              '  "summary": "string — synthèse en 2-4 phrases",\n' +
              '  "writing_style": {\n' +
              '    "tone": "string",\n' +
              '    "formality": "string",\n' +
              '    "vocabulary": "string",\n' +
              '    "perspective": "string — tutoiement/vouvoiement/nous"\n' +
              '  },\n' +
              '  "visual_direction": {\n' +
              '    "mood": "string — ambiance visuelle globale",\n' +
              '    "imagery": "string — types d\'images/métaphores à privilégier",\n' +
              '    "layout_hint": "string — organisation visuelle (densité, hiérarchie)",\n' +
              '    "color_association": "string — associations chromatiques ou contrastes (sans inventer de codes hex si absents)"\n' +
              '  },\n' +
              '  "brand_personality": "string — adjectifs et posture de marque",\n' +
              '  "target_audience": "string",\n' +
              '  "key_offerings": ["string", "..."],\n' +
              '  "keywords_for_visuals": ["string", "..."],\n' +
              '  "avoid_or_constraints": "string — ce qu\'il faut éviter ou contraintes créatives"\n' +
              '}\n\n' +
              `Description :\n${descriptionText}`,
          },
        ],
      });

      let ai_profile: Record<string, unknown>;
      try {
        ai_profile = JSON.parse(stripJsonFence(raw)) as Record<string, unknown>;
      } catch {
        console.error('company-description-ai json_parse', raw.slice(0, 400));
        return fail('ai_invalid_json');
      }

      return ok({ ai_profile });
    }

    if (action === 'description_step1_turn') {
      const { data: orgRow, error: orgMetaErr } = await admin
        .from('orgs')
        .select('name, website')
        .eq('id', orgId)
        .maybeSingle();
      if (orgMetaErr || !orgRow) {
        return fail('org_not_found');
      }
      const orgName = String(orgRow.name ?? '').trim();
      const websiteFromDb = String(orgRow.website ?? '').trim();
      const existingWebsiteParam = String(body.existing_website ?? '').trim();

      const canonicalExisting =
        existingWebsiteParam.length > 0 ? existingWebsiteParam : websiteFromDb;

      const sanitized = sanitizeStep1Messages(body.messages);
      const dialogue: ChatTurnMsg[] =
        sanitized.length === 0 ? [{ role: 'user', content: STEP1_BOOTSTRAP_USER }] : sanitized;

      const websiteFollowUpRaw = String(body.website_followup_site_context ?? '').trim();
      const websiteFollowUpClipped =
        websiteFollowUpRaw.length > 3800
          ? `${websiteFollowUpRaw.slice(0, 3800)}…`
          : websiteFollowUpRaw;
      const inWebsiteFollowUpMode = websiteFollowUpClipped.length > 0;

      const flow = deriveFlowState(dialogue);
      const lastUserMsg = (() => {
        for (let i = dialogue.length - 1; i >= 0; i--) {
          if (dialogue[i].role === 'user') return dialogue[i].content;
        }
        return '';
      })();
      const lastAssistantMsg = (() => {
        for (let i = dialogue.length - 1; i >= 0; i--) {
          if (dialogue[i].role === 'assistant') return dialogue[i].content;
        }
        return '';
      })();
      const isBootstrapTurn =
        dialogue.length === 1 && dialogue[0].role === 'user' && dialogue[0].content === STEP1_BOOTSTRAP_USER;

      const lastAssistantAskedDichotomyNow = assistantAskedDichotomy(lastAssistantMsg);
      const lastUserPicksSite =
        lastAssistantAskedDichotomyNow &&
        userChoosesSiteBranch(lastUserMsg) &&
        !userChoosesQuestionsBranch(lastUserMsg);
      const lastUserPicksQuestions =
        lastAssistantAskedDichotomyNow && userChoosesQuestionsBranch(lastUserMsg);

      /** Branchement déterministe site → prefill_website (priorité au dernier choix utilisateur). */
      if (!inWebsiteFollowUpMode) {
        const url = canonicalExisting || flow.userProvidedUrl;
        if (url && lastUserPicksSite) {
          return ok({ step1_phase: 'prefill_website', website_url: url });
        }
        if (
          url &&
          !lastUserPicksQuestions &&
          flow.acceptedSiteBranch &&
          !flow.pickedQuestionsBranch &&
          !flow.declaredNoSite
        ) {
          return ok({ step1_phase: 'prefill_website', website_url: url });
        }
      }

      /** Bootstrap déterministe : premier tour de Lia, sans déléguer au LLM. */
      if (isBootstrapTurn) {
        if (inWebsiteFollowUpMode) {
          return ok({
            step1_phase: 'continue',
            message_for_user:
              'Le contenu public de votre site n’a pas suffi à rédiger une description complète. Pouvez-vous me décrire en quelques phrases l’activité principale de votre entreprise et ce que vous proposez à vos clients ?',
          });
        }
        if (canonicalExisting.length > 0) {
          return ok({
            step1_phase: 'continue',
            message_for_user: `Une URL de site est enregistrée sur votre fiche : ${canonicalExisting}. Souhaitez-vous que je génère automatiquement la description à partir de ce site, ou préférez-vous répondre à quelques questions pour la rédiger sans utiliser le site ?`,
          });
        }
        return ok({
          step1_phase: 'continue',
          message_for_user:
            'Avez-vous un site web pour votre entreprise ? Si oui, indiquez son URL ; sinon, je vous poserai quelques questions pour rédiger votre description.',
        });
      }

      /** L'utilisateur vient de fournir une URL alors qu'aucune n'était sur la fiche : poser la dichotomie. */
      if (
        !inWebsiteFollowUpMode &&
        !canonicalExisting &&
        flow.userProvidedUrl &&
        !flow.acceptedSiteBranch &&
        !flow.pickedQuestionsBranch &&
        !assistantAskedDichotomy(lastAssistantMsg)
      ) {
        return ok({
          step1_phase: 'continue',
          message_for_user: `Très bien — je note ${flow.userProvidedUrl}. Souhaitez-vous que je génère automatiquement la description à partir de ce site, ou préférez-vous répondre à quelques questions pour la rédiger sans utiliser le site ?`,
        });
      }

      /** L'utilisateur a dit ne pas avoir de site → premier message ciblé activité. */
      if (
        !inWebsiteFollowUpMode &&
        flow.declaredNoSite &&
        flow.substantiveUserMessagesCount === 0
      ) {
        return ok({
          step1_phase: 'continue',
          message_for_user:
            'Très bien, nous allons donc rédiger ensemble. Pouvez-vous me décrire en quelques phrases l’activité principale de votre entreprise, ce que vous faites au quotidien et pour qui ?',
        });
      }

      /** L'utilisateur a choisi la branche « questions » alors qu'un site existe : enchaîner immédiatement. */
      if (
        !inWebsiteFollowUpMode &&
        flow.pickedQuestionsBranch &&
        flow.substantiveUserMessagesCount === 0
      ) {
        return ok({
          step1_phase: 'continue',
          message_for_user:
            'Parfait, on construit la description ensemble. Pouvez-vous me décrire en quelques phrases l’activité principale de votre entreprise et ce que vous proposez à vos clients ?',
        });
      }

      /** Mode questions actif (l'utilisateur s'exprime sur l'activité) : on relaie au LLM avec un prompt strict. */
      const inQuestionsMode =
        inWebsiteFollowUpMode || flow.pickedQuestionsBranch || flow.declaredNoSite ||
        flow.substantiveUserMessagesCount >= 1;

      const coverage = inQuestionsMode
        ? computeTopicCoverage(flow.substantiveUserMessages)
        : null;

      const previousAssistantTexts = dialogue.filter((m) => m.role === 'assistant').map((m) => m.content);

      const nextDeterministicQuestion = inQuestionsMode && coverage
        ? pickNextDeterministicQuestion(coverage, previousAssistantTexts)
        : null;

      const coverageSummary = coverage
        ? [
            `activité : ${coverage.activity ? 'couvert' : 'à creuser'}`,
            `offres : ${coverage.offerings ? 'couvert' : 'à creuser'}`,
            `clients : ${coverage.clients ? 'couvert' : 'à creuser'}`,
            `différenciation : ${coverage.differentiation ? 'couvert' : 'à creuser'}`,
            `géographie/contexte : ${coverage.geography ? 'couvert' : 'à creuser'}`,
            `valeurs / ton : ${coverage.values_tone ? 'couvert' : 'à creuser'}`,
          ].join(' · ')
        : null;

      const coveredCount = coverage
        ? Object.values(coverage).filter(Boolean).length
        : 0;
      const enoughForSynthesis =
        inQuestionsMode &&
        ((coveredCount >= 4 && flow.substantiveUserMessagesCount >= 3) ||
          flow.substantiveUserMessagesCount >= 6);

      const systemBlocks: string[] = [STEP1_SYSTEM];

      systemBlocks.push(
        canonicalExisting.length > 0
          ? `CONTEXT_SITE : une URL est déjà enregistrée sur la fiche entreprise : ${canonicalExisting}`
          : `CONTEXT_SITE : aucune URL de site n'est enregistrée sur la fiche entreprise pour le moment.`,
      );
      if (orgName) {
        systemBlocks.push(
          `Nom d'organisation sur la fiche : « ${orgName} » (ne pas inventer d'autres faits).`,
        );
      }

      if (inQuestionsMode) {
        const stateLines = [
          'MODE_ACTIF : QUESTIONS_BUSINESS — l’utilisateur a déjà été aiguillé vers le parcours questions (refus du site, absence de site, ou contenu du site insuffisant). Ne reformule JAMAIS la question dichotomique « site automatique vs questions ». Ne renvoie pas phase prefill_website.',
          coverageSummary ? `Sujets déjà recueillis : ${coverageSummary}` : '',
          nextDeterministicQuestion
            ? `Sujet prioritaire suivant : ${nextDeterministicQuestion.key}. Tu peux t’inspirer de cette formulation (ou la reformuler de façon naturelle) : « ${nextDeterministicQuestion.question} »`
            : '',
          enoughForSynthesis
            ? 'Tu DOIS produire maintenant {"phase":"announce_then_complete","message_for_user":"...","draft_description":"..."}. message_for_user remercie brièvement et annonce la rédaction (sans coller le brouillon). draft_description : texte fluide 700–1400 caractères, factuel, sans superlatifs creux, exploitant TOUTES les informations utiles données par l’utilisateur dans le fil.'
            : 'Pose UNE seule question, courte (≤ 240 caractères), ciblée sur un sujet « à creuser » différent de ceux déjà couverts, en t’appuyant sur ce que l’utilisateur a déjà dit (cite un détail si pertinent). Ne pose pas plusieurs questions à la fois.',
        ]
          .filter(Boolean)
          .join('\n');
        systemBlocks.push(stateLines);
      }

      if (inWebsiteFollowUpMode) {
        systemBlocks.push(
          [
            'MODE_SUITE_SITE_INSUFFISANT :',
            "L'utilisateur avait choisi une description générée depuis son site web, mais le contenu extrait automatiquement était trop pauvre pour livrer une description finale sans questions complémentaires.",
            'Résumé factuel interne (ne pas recopier tel quel à l’utilisateur ; t’en inspirer pour des questions pertinentes) :',
            '---',
            websiteFollowUpClipped,
            '---',
            'Reste en MODE_ACTIF QUESTIONS_BUSINESS. Ne reformule pas la dichotomie. Ne renvoie pas prefill_website (sauf demande explicite d’un nouveau crawl par l’utilisateur, cas rare).',
          ].join('\n'),
        );
      }

      const systemContent = systemBlocks.filter(Boolean).join('\n\n');

      const chatMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
        { role: 'system', content: systemContent },
        ...dialogue,
      ];

      const raw = await deepSeekChatCompletion({
        runtime,
        temperature: enoughForSynthesis ? 0.35 : 0.22,
        max_tokens: 8192,
        messages: chatMessages,
      });

      const STEP1_REPAIR_USER = inQuestionsMode
        ? 'Ta dernière réponse n\'était pas uniquement un objet JSON valide. Renvoie UN SEUL objet JSON UTF-8, sans markdown ni texte autour. Tu es en MODE QUESTIONS_BUSINESS : NE REPOSE PAS la dichotomie site/questions. Si la conversation doit continuer : {"phase":"continue","message_for_user":"..."} avec UNE seule question métier nouvelle, ciblée sur un sujet « à creuser » non couvert. Si tu livres la description : {"phase":"announce_then_complete","message_for_user":"...","draft_description":"..."}.'
        : 'Ta dernière réponse n\'était pas uniquement un objet JSON valide. Renvoie UN SEUL objet JSON UTF-8, sans markdown ni texte autour. Si l\'entretien doit continuer : {"phase":"continue","message_for_user":"..."}. Si tu livres la description après questions : {"phase":"announce_then_complete","message_for_user":"...","draft_description":"..."}.';

      let parsedObj = parseStep1AssistantPayload(raw);
      if (!parsedObj) {
        console.warn('company-description-ai step1 repair pass');
        const clipped = raw.length > 4000 ? `${raw.slice(0, 4000)}…` : raw;
        const repairRaw = await deepSeekChatCompletion({
          runtime,
          temperature: 0.08,
          max_tokens: 6144,
          messages: [
            ...chatMessages,
            { role: 'assistant', content: clipped },
            { role: 'user', content: STEP1_REPAIR_USER },
          ],
        });
        parsedObj = parseStep1AssistantPayload(repairRaw);
      }

      if (!parsedObj) {
        console.error('company-description-ai step1 json_parse_final', raw.slice(0, 800));
        if (nextDeterministicQuestion) {
          return ok({ step1_phase: 'continue', message_for_user: nextDeterministicQuestion.question });
        }
        return fail('ai_invalid_json');
      }

      const parsed = parsedObj as {
        phase?: string;
        message_for_user?: string;
        draft_description?: string;
        website_url?: string;
      };

      const phase = String(parsed.phase ?? '').trim();

      if (phase === 'continue') {
        let messageForUser = String(parsed.message_for_user ?? '').trim();
        if (!messageForUser) return fail('ai_invalid_json');

        if (inQuestionsMode && assistantAskedDichotomy(messageForUser)) {
          if (nextDeterministicQuestion) {
            messageForUser = nextDeterministicQuestion.question;
          } else if (enoughForSynthesis) {
            return ok({
              step1_phase: 'continue',
              message_for_user:
                'Merci pour ces détails — je rédige une première version de votre description maintenant.',
            });
          }
        }
        return ok({ step1_phase: 'continue', message_for_user: messageForUser });
      }

      if (phase === 'prefill_website') {
        if (inQuestionsMode || flow.pickedQuestionsBranch || flow.declaredNoSite) {
          if (nextDeterministicQuestion) {
            return ok({
              step1_phase: 'continue',
              message_for_user: nextDeterministicQuestion.question,
            });
          }
        }
        const websiteUrl = String(parsed.website_url ?? '').trim() || canonicalExisting || flow.userProvidedUrl || '';
        if (!websiteUrl) return fail('ai_invalid_json');
        return ok({ step1_phase: 'prefill_website', website_url: websiteUrl });
      }

      if (phase === 'announce_then_complete') {
        const announcement = String(parsed.message_for_user ?? '').trim();
        const draft = String(parsed.draft_description ?? '').trim();
        if (!announcement) return fail('ai_invalid_json');
        if (draft.length < 80) return fail('coach_draft_too_short');
        return ok({
          step1_phase: 'announce_then_complete',
          message_for_user: announcement,
          draft_description: draft,
        });
      }

      if (phase === 'done') {
        const draft = String(parsed.draft_description ?? '').trim();
        if (draft.length < 80) return fail('coach_draft_too_short');
        return ok({ step1_phase: 'done', draft_description: draft });
      }

      return fail('ai_invalid_json');
    }

    return fail('unknown_action');
  } catch (e) {
    console.error('company-description-ai', e);
    const msg = e instanceof Error ? e.message : 'internal_error';
    if (msg.startsWith('deepseek_http_')) {
      return fail(msg);
    }
    return fail('internal_error');
  }
});
