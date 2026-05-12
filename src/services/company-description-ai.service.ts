import { supabase } from '@/lib/supabase';
import type { CompanyDescriptionAiProfile } from '@/types/company-description-ai';

export type DescriptionStep1Message = { role: 'user' | 'assistant'; content: string };

export type DescriptionStep1TurnResult =
  | { step1_phase: 'continue'; message_for_user: string }
  | { step1_phase: 'prefill_website'; website_url: string }
  | {
      step1_phase: 'announce_then_complete';
      message_for_user: string;
      draft_description: string;
    }
  | { step1_phase: 'done'; draft_description: string };

export type PrefillFromWebsiteResult =
  | { kind: 'complete'; draft: string }
  | { kind: 'needs_follow_up'; assistantMessage: string; siteContextForAi: string };

const ERR_FR: Record<string, string> = {
  forbidden: 'Vous ne pouvez pas modifier cette entreprise.',
  unauthorized: 'Session expirée.',
  missing_authorization: 'Authentification requise.',
  server_misconfigured: 'Configuration serveur LLM manquante.',
  permission_check_failed: 'Impossible de vérifier vos droits.',
  method_not_allowed: 'Méthode non autorisée.',
  unknown_action: 'Action inconnue.',
  llm_not_configured:
    'Aucun modèle DeepSeek « deepseek-v4-flash » actif avec secret configuré. Ajoutez-le dans Administration → Gestion IA.',
  website_required: 'Indiquez d’abord l’URL du site dans Informations.',
  description_too_short: 'Écrivez ou complétez la description avant analyse (quelques phrases minimum).',
  org_not_found: 'Entreprise introuvable.',
  fetch_failed: 'Impossible de télécharger la page du site.',
  extracted_text_too_short: 'Contenu du site trop pauvre pour proposer un texte automatiquement.',
  page_too_large: 'Page web trop volumineuse.',
  ai_invalid_json: 'Réponse IA illisible, réessayez.',
  internal_error: 'Erreur serveur.',
  coach_draft_too_short:
    'La proposition IA était trop courte. Réessayez ou poursuivez l’échange puis demandez la rédaction finale.',
};

function msg(code: string): string {
  if (ERR_FR[code]) return ERR_FR[code];
  if (code.startsWith('deepseek_http_')) {
    return `Erreur DeepSeek (${code.replace('deepseek_http_', 'HTTP ')})`;
  }
  return code.replace(/_/g, ' ');
}

async function invoke(action: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.functions.invoke('company-description-ai', {
    body: { action, ...payload },
  });
  if (error) {
    throw new Error(error.message || 'Service IA indisponible');
  }
  const out = data as {
    ok?: boolean;
    error?: string;
    outcome?: string;
    draft_description?: string;
    site_notes_for_followup?: string;
    ai_profile?: CompanyDescriptionAiProfile;
    step1_phase?: string;
    message_for_user?: string;
    website_url?: string;
  };
  if (!out?.ok) {
    throw new Error(msg(out?.error ?? 'unknown'));
  }
  return out as Record<string, unknown>;
}

export const companyDescriptionAiService = {
  async prefillFromWebsite(orgId: string, websiteUrl?: string): Promise<PrefillFromWebsiteResult> {
    const body = await invoke('prefill_from_website', {
      org_id: orgId,
      ...(websiteUrl?.trim() ? { website_url: websiteUrl.trim() } : {}),
    });
    const outcome = String(body.outcome ?? '').trim();
    if (outcome === 'complete') {
      const draft = typeof body.draft_description === 'string' ? body.draft_description.trim() : '';
      if (!draft) throw new Error('Réponse IA vide');
      return { kind: 'complete', draft };
    }
    if (outcome === 'needs_chat_followup') {
      const assistantMessage =
        typeof body.message_for_user === 'string' ? body.message_for_user.trim() : '';
      const siteContextForAi =
        typeof body.site_notes_for_followup === 'string' ? body.site_notes_for_followup.trim() : '';
      if (!assistantMessage) throw new Error('Réponse IA vide');
      return {
        kind: 'needs_follow_up',
        assistantMessage,
        siteContextForAi:
          siteContextForAi.length > 0 ? siteContextForAi : `Notes site (succinctes) : ${assistantMessage}`,
      };
    }
    throw new Error('Réponse IA illisible');
  },

  async analyzeDescription(orgId: string, descriptionText: string): Promise<CompanyDescriptionAiProfile> {
    const body = await invoke('analyze_description', {
      org_id: orgId,
      description_text: descriptionText.trim(),
    });
    const profile = body.ai_profile;
    if (!profile || typeof profile !== 'object') throw new Error('Profil IA vide');
    return profile as CompanyDescriptionAiProfile;
  },

  async descriptionStep1Turn(
    orgId: string,
    messages: DescriptionStep1Message[],
    existingWebsite?: string | null,
    websiteFollowupSiteContext?: string | null,
  ): Promise<DescriptionStep1TurnResult> {
    const ctx = websiteFollowupSiteContext?.trim();
    const body = await invoke('description_step1_turn', {
      org_id: orgId,
      messages,
      existing_website: existingWebsite?.trim() ?? '',
      ...(ctx ? { website_followup_site_context: ctx } : {}),
    });
    const phase = body.step1_phase;
    if (phase === 'continue') {
      const messageForUser =
        typeof body.message_for_user === 'string' ? body.message_for_user.trim() : '';
      if (!messageForUser) throw new Error('Réponse IA vide');
      return { step1_phase: 'continue', message_for_user: messageForUser };
    }
    if (phase === 'prefill_website') {
      const websiteUrl = typeof body.website_url === 'string' ? body.website_url.trim() : '';
      if (!websiteUrl) throw new Error('Réponse IA vide');
      return { step1_phase: 'prefill_website', website_url: websiteUrl };
    }
    if (phase === 'announce_then_complete') {
      const announcement =
        typeof body.message_for_user === 'string' ? body.message_for_user.trim() : '';
      const draft =
        typeof body.draft_description === 'string' ? body.draft_description.trim() : '';
      if (!announcement || !draft) throw new Error('Réponse IA vide');
      return {
        step1_phase: 'announce_then_complete',
        message_for_user: announcement,
        draft_description: draft,
      };
    }
    if (phase === 'done') {
      const draft =
        typeof body.draft_description === 'string' ? body.draft_description.trim() : '';
      if (!draft) throw new Error('Réponse IA vide');
      return { step1_phase: 'done', draft_description: draft };
    }
    throw new Error('Réponse IA illisible');
  },
};
