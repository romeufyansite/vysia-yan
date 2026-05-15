/*
  Platform LLM configurations — metadata only for admins (RLS).
  Secrets live in platform_llm_model_secrets + Edge Function encryption (see later migration).
*/

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.platform_role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

CREATE TABLE IF NOT EXISTS public.platform_llm_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  display_name text NOT NULL,
  provider text NOT NULL CHECK (provider IN (
    'openai',
    'anthropic',
    'google',
    'azure_openai',
    'custom',
    'deepseek'
  )),
  api_model_id text NOT NULL,
  api_base_url text,
  secret_configured boolean NOT NULL DEFAULT false,
  is_enabled boolean NOT NULL DEFAULT true,
  notes text,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_platform_llm_models_sort ON public.platform_llm_models (sort_order, created_at);

ALTER TABLE public.platform_llm_models ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_llm_models_admin_all" ON public.platform_llm_models;

CREATE POLICY "platform_llm_models_admin_all"
  ON public.platform_llm_models
  FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_llm_models TO authenticated;
