-- Extend LLM provider enum with DeepSeek (OpenAI-compatible API).

ALTER TABLE public.platform_llm_models DROP CONSTRAINT IF EXISTS platform_llm_models_provider_check;

ALTER TABLE public.platform_llm_models ADD CONSTRAINT platform_llm_models_provider_check CHECK (
  provider IN (
    'openai',
    'anthropic',
    'google',
    'azure_openai',
    'custom',
    'deepseek'
  )
);
