/*
  # Add organization details and branding

  1. Changes to `orgs` table
    Legal/billing info columns:
      - `legal_name` (text) - raison sociale
      - `registration_number` (text) - SIRET/numéro d'enregistrement
      - `vat_number` (text) - numéro de TVA
      - `address_line1` (text)
      - `address_line2` (text)
      - `postal_code` (text)
      - `city` (text)
      - `country` (text)
      - `billing_email` (text)
      - `billing_phone` (text)
    Branding columns:
      - `logo_url` (text) - URL du logo
      - `website` (text) - site web
      - `brand_colors` (jsonb) - tableau de couleurs { name, hex }
      - `updated_at` (timestamptz)

  2. Security
    Ensure RLS enabled and add policies so members of an organization can view/update their own org.

  ## Notes
    - All columns are nullable (no defaults besides brand_colors -> empty array) so existing rows remain intact.
    - Uses conditional ALTER so migration is re-runnable.
*/

DO $$
DECLARE
  col text;
  cols text[] := ARRAY[
    'legal_name text',
    'registration_number text',
    'vat_number text',
    'address_line1 text',
    'address_line2 text',
    'postal_code text',
    'city text',
    'country text',
    'billing_email text',
    'billing_phone text',
    'logo_url text',
    'website text'
  ];
  col_name text;
  col_type text;
BEGIN
  FOREACH col IN ARRAY cols LOOP
    col_name := split_part(col, ' ', 1);
    col_type := substring(col from position(' ' in col) + 1);
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'orgs' AND column_name = col_name
    ) THEN
      EXECUTE format('ALTER TABLE orgs ADD COLUMN %I %s', col_name, col_type);
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orgs' AND column_name = 'brand_colors'
  ) THEN
    ALTER TABLE orgs ADD COLUMN brand_colors jsonb NOT NULL DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orgs' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE orgs ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'orgs' AND policyname = 'Members can view their org'
  ) THEN
    CREATE POLICY "Members can view their org"
      ON orgs FOR SELECT
      TO authenticated
      USING (
        id IN (SELECT org_id FROM profiles WHERE profiles.id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'orgs' AND policyname = 'Members can update their org'
  ) THEN
    CREATE POLICY "Members can update their org"
      ON orgs FOR UPDATE
      TO authenticated
      USING (
        id IN (SELECT org_id FROM profiles WHERE profiles.id = auth.uid())
      )
      WITH CHECK (
        id IN (SELECT org_id FROM profiles WHERE profiles.id = auth.uid())
      );
  END IF;
END $$;
