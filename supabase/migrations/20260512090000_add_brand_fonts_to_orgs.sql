-- Polices de marque (JSON : [{ "id","name","family" }] — family utilisée comme stack CSS courte)

ALTER TABLE orgs ADD COLUMN IF NOT EXISTS brand_fonts jsonb NOT NULL DEFAULT '[]'::jsonb;

