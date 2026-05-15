/*
  LLM API secrets: encrypted at rest, never readable via PostgREST for authenticated users.
  - Drops legacy plaintext api_key on platform_llm_models (re-enter keys after deploy).
  - Secrets table has NO grants for anon/authenticated — only service_role (Edge Functions).
*/

ALTER TABLE public.platform_llm_models DROP COLUMN IF EXISTS api_key;

ALTER TABLE public.platform_llm_models
  ADD COLUMN IF NOT EXISTS secret_configured boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.platform_llm_model_secrets (
  model_id uuid PRIMARY KEY REFERENCES public.platform_llm_models(id) ON DELETE CASCADE,
  nonce_b64 text NOT NULL,
  ciphertext_b64 text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_llm_model_secrets_nonce_nonempty CHECK (length(trim(nonce_b64)) > 0),
  CONSTRAINT platform_llm_model_secrets_cipher_nonempty CHECK (length(trim(ciphertext_b64)) > 0)
);

ALTER TABLE public.platform_llm_model_secrets ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.platform_llm_model_secrets FROM PUBLIC;
REVOKE ALL ON TABLE public.platform_llm_model_secrets FROM anon;
REVOKE ALL ON TABLE public.platform_llm_model_secrets FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.platform_llm_model_secrets TO service_role;

COMMENT ON TABLE public.platform_llm_model_secrets IS
  'AES-GCM ciphertext for LLM API keys. Accessible only via service_role (Edge Functions), never via anon/authenticated PostgREST.';

REVOKE INSERT ON public.platform_llm_models FROM authenticated;

CREATE OR REPLACE FUNCTION public.platform_llm_models_enforce_secret_flag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.secret_configured = true THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.platform_llm_model_secrets s WHERE s.model_id = NEW.id
    ) THEN
      RAISE EXCEPTION 'secret_configured_requires_encrypted_secret_row';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_platform_llm_models_secret_flag ON public.platform_llm_models;
CREATE TRIGGER trg_platform_llm_models_secret_flag
  BEFORE INSERT OR UPDATE ON public.platform_llm_models
  FOR EACH ROW
  EXECUTE FUNCTION public.platform_llm_models_enforce_secret_flag();
