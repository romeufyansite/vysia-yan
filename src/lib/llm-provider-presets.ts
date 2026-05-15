import type { PlatformLlmProvider } from '@/types/platform-llm';

export interface LlmProviderMeta {
  label: string;
  defaultBaseUrl: string;
  docUrl: string;
}

export const LLM_PROVIDER_META: Record<PlatformLlmProvider, LlmProviderMeta> = {
  openai: {
    label: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    docUrl: 'https://platform.openai.com/docs/models',
  },
  anthropic: {
    label: 'Anthropic',
    defaultBaseUrl: 'https://api.anthropic.com',
    docUrl: 'https://docs.anthropic.com/en/docs/about-claude/models',
  },
  google: {
    label: 'Google AI (Gemini)',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    docUrl: 'https://ai.google.dev/gemini-api/docs/models/gemini',
  },
  azure_openai: {
    label: 'Azure OpenAI',
    defaultBaseUrl: '',
    docUrl: 'https://learn.microsoft.com/azure/ai-services/openai/',
  },
  custom: {
    label: 'Personnalisé',
    defaultBaseUrl: '',
    docUrl: '',
  },
  deepseek: {
    label: 'DeepSeek',
    defaultBaseUrl: 'https://api.deepseek.com',
    docUrl: 'https://api-docs.deepseek.com/',
  },
};

export interface LlmQuickPreset {
  id: string;
  label: string;
  provider: PlatformLlmProvider;
  displayName: string;
  apiModelId: string;
  /** Help administrators align with provider naming. */
  hint?: string;
}

/** Curated shortcuts — IDs change over time; users should verify against vendor docs. */
export const LLM_QUICK_PRESETS: readonly LlmQuickPreset[] = [
  {
    id: 'openai-gpt5',
    label: 'GPT-5 (OpenAI)',
    provider: 'openai',
    displayName: 'GPT-5',
    apiModelId: 'gpt-5',
    hint: 'Vérifiez l’identifiant exact dans la console OpenAI.',
  },
  {
    id: 'openai-gpt41',
    label: 'GPT-4.1 (OpenAI)',
    provider: 'openai',
    displayName: 'GPT-4.1',
    apiModelId: 'gpt-4.1',
  },
  {
    id: 'anthropic-opus',
    label: 'Claude Opus 4',
    provider: 'anthropic',
    displayName: 'Claude Opus 4',
    apiModelId: 'claude-opus-4-20250514',
    hint: 'Remplacez par la variante la plus récente listée par Anthropic.',
  },
  {
    id: 'anthropic-opus-product',
    label: 'OPUS 4.7 (nom commercial)',
    provider: 'anthropic',
    displayName: 'OPUS 4.7',
    apiModelId: 'claude-opus-4-20250514',
    hint:
      'Les libellés marketing diffèrent des IDs API : vérifiez le modèle exact dans la console Anthropic et mettez à jour l\'identifiant.',
  },
  {
    id: 'anthropic-sonnet',
    label: 'Claude Sonnet 4',
    provider: 'anthropic',
    displayName: 'Claude Sonnet 4',
    apiModelId: 'claude-sonnet-4-20250514',
  },
  {
    id: 'google-gemini25',
    label: 'Gemini 2.5 Pro',
    provider: 'google',
    displayName: 'Gemini 2.5 Pro',
    apiModelId: 'gemini-2.5-pro-preview-06-05',
    hint: 'Les noms preview évoluent souvent — consultez la doc Google AI.',
  },
  {
    id: 'deepseek-v4-pro',
    label: 'DeepSeek V4 Pro',
    provider: 'deepseek',
    displayName: 'DeepSeek V4 Pro',
    apiModelId: 'deepseek-v4-pro',
    hint: 'API compatible OpenAI — voir la doc pour les options « thinking » / reasoning.',
  },
  {
    id: 'deepseek-v4-flash',
    label: 'DeepSeek V4 Flash',
    provider: 'deepseek',
    displayName: 'DeepSeek V4 Flash',
    apiModelId: 'deepseek-v4-flash',
  },
  {
    id: 'deepseek-chat-legacy',
    label: 'DeepSeek Chat (alias hérité)',
    provider: 'deepseek',
    displayName: 'DeepSeek Chat',
    apiModelId: 'deepseek-chat',
    hint: 'Alias historique — DeepSeek prévoit son retrait ; préférez V4 Flash selon la doc officielle.',
  },
  {
    id: 'deepseek-reasoner-legacy',
    label: 'DeepSeek Reasoner (alias hérité)',
    provider: 'deepseek',
    displayName: 'DeepSeek Reasoner',
    apiModelId: 'deepseek-reasoner',
    hint: 'Alias historique pour le mode « thinking » de V4 Flash — dates de fin annoncées dans la doc.',
  },
];

export function defaultBaseUrlForProvider(provider: PlatformLlmProvider): string {
  const url = LLM_PROVIDER_META[provider].defaultBaseUrl;
  return url ?? '';
}
