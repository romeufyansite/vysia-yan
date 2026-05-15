-- Description entreprise + profil IA (résumé, style rédactionnel, direction visuelle, etc.)

ALTER TABLE public.orgs ADD COLUMN IF NOT EXISTS company_description text;

ALTER TABLE public.orgs ADD COLUMN IF NOT EXISTS company_description_ai jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.orgs.company_description IS
  'Texte libre : présentation entreprise, offre, produits et services (éditable par le gestionnaire).';

COMMENT ON COLUMN public.orgs.company_description_ai IS
  'Synthèse et axes stylistiques produits par le modèle DeepSeek (profil pour futurs visuels).';
