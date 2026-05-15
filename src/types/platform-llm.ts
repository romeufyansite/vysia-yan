export type PlatformLlmProvider =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'azure_openai'
  | 'custom'
  | 'deepseek';

export interface PlatformLlmModelSummary {
  id: string;
  created_at: string;
  updated_at: string;
  display_name: string;
  provider: PlatformLlmProvider;
  api_model_id: string;
  api_base_url: string | null;
  is_enabled: boolean;
  notes: string | null;
  sort_order: number;
  /** True once an API key has been stored via the secure Edge Function. */
  secret_configured: boolean;
}

export interface PlatformLlmCreatePayload {
  display_name: string;
  provider: PlatformLlmProvider;
  api_model_id: string;
  api_base_url: string | null;
  api_key: string;
  notes?: string | null;
  sort_order?: number;
  is_enabled?: boolean;
}

export interface PlatformLlmSecureUpdatePayload {
  display_name: string;
  provider: PlatformLlmProvider;
  api_model_id: string;
  api_base_url: string | null;
  notes: string | null;
  /** When set, replaces the encrypted secret server-side. */
  api_key?: string;
}
