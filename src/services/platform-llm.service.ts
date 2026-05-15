import { supabase } from '@/lib/supabase';
import type {
  PlatformLlmCreatePayload,
  PlatformLlmModelSummary,
  PlatformLlmSecureUpdatePayload,
} from '@/types/platform-llm';

const SUMMARY_COLUMNS =
  'id, created_at, updated_at, display_name, provider, api_model_id, api_base_url, is_enabled, notes, sort_order, secret_configured';

const EDGE_ERRORS_FR: Record<string, string> = {
  forbidden: 'Accès refusé.',
  unauthorized: 'Session expirée. Reconnectez-vous.',
  missing_authorization: 'Session invalide.',
  server_misconfigured:
    'La clé de chiffrement des secrets LLM n’est pas configurée côté serveur (PLATFORM_LLM_MASTER_KEY_HEX).',
  display_name_api_model_id_api_key_required: 'Nom, identifiant API et clé sont requis.',
  invalid_provider: 'Fournisseur non reconnu.',
  create_failed: 'Création du modèle impossible.',
  secret_store_failed: 'Stockage sécurisé de la clé impossible.',
  finalize_failed: 'Finalisation impossible.',
  id_required: 'Identifiant modèle manquant.',
  update_failed: 'Mise à jour des métadonnées impossible.',
  secret_rotate_failed: 'Rotation de la clé impossible.',
  internal_error: 'Erreur serveur.',
};

function edgeMessage(code: string): string {
  return EDGE_ERRORS_FR[code] ?? code;
}

async function invokePlatformLlmAdmin(
  body: Record<string, unknown>,
  method: 'POST' | 'PATCH' = 'POST',
): Promise<{ id?: string }> {
  const { data, error } = await supabase.functions.invoke('platform-llm-admin', { body, method });
  if (error) {
    throw new Error(error.message || 'Appel à la fonction sécurisée impossible');
  }
  const payload = data as { ok?: boolean; id?: string; error?: string } | null;
  if (payload?.error) {
    throw new Error(edgeMessage(payload.error));
  }
  return { id: payload?.id };
}

export const platformLlmService = {
  async list(): Promise<PlatformLlmModelSummary[]> {
    const { data, error } = await supabase
      .from('platform_llm_models')
      .select(SUMMARY_COLUMNS)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data as PlatformLlmModelSummary[]) ?? [];
  },

  /** Creates model metadata + encrypts and stores the API key server-side (Edge Function). */
  async createSecure(row: PlatformLlmCreatePayload): Promise<string> {
    const { id } = await invokePlatformLlmAdmin({
      display_name: row.display_name.trim(),
      provider: row.provider,
      api_model_id: row.api_model_id.trim(),
      api_base_url: row.api_base_url?.trim() || null,
      api_key: row.api_key.trim(),
      notes: row.notes?.trim() || null,
      sort_order: row.sort_order ?? 0,
      is_enabled: row.is_enabled ?? true,
    });
    if (!id) throw new Error('Réponse serveur invalide');
    return id;
  },

  /** Updates metadata and optionally rotates the API key (never sends existing secret). */
  async updateSecure(modelId: string, payload: PlatformLlmSecureUpdatePayload): Promise<void> {
    const body: Record<string, unknown> = {
      id: modelId,
      display_name: payload.display_name.trim(),
      provider: payload.provider,
      api_model_id: payload.api_model_id.trim(),
      api_base_url: payload.api_base_url?.trim() || null,
      notes: payload.notes?.trim() || null,
    };
    const k = payload.api_key?.trim();
    if (k) body.api_key = k;
    await invokePlatformLlmAdmin(body, 'PATCH');
  },

  async update(id: string, patch: { is_enabled?: boolean; sort_order?: number }): Promise<void> {
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (patch.is_enabled !== undefined) payload.is_enabled = patch.is_enabled;
    if (patch.sort_order !== undefined) payload.sort_order = patch.sort_order;

    const { error } = await supabase.from('platform_llm_models').update(payload).eq('id', id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('platform_llm_models').delete().eq('id', id);
    if (error) throw error;
  },

  async setEnabled(id: string, is_enabled: boolean): Promise<void> {
    await this.update(id, { is_enabled });
  },
};
