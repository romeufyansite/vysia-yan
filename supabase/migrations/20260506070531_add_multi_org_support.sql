/*
  # Multi-organization support per user

  1. Changes
    - Add `owner_user_id` column to `orgs` to track the creator of an organization.
      Existing organisations are backfilled by taking the first profile attached to each org.
    - Allow a user to own multiple organisations.
  2. Security
    - Add INSERT policy on `orgs` so any authenticated user can create an organisation
      where they are the owner.
    - Add DELETE policy on `orgs` limited to the owner. A trigger enforces that a user
      cannot delete their last remaining organisation (at least one must remain).
  3. Notes
    - `profiles.org_id` still points to the "current" selected org for a user, but a user
      may now be owner of additional orgs listed via `owner_user_id`.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orgs' AND column_name = 'owner_user_id'
  ) THEN
    ALTER TABLE orgs ADD COLUMN owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Backfill owner_user_id for existing orgs based on profiles.org_id
UPDATE orgs o
SET owner_user_id = (
  SELECT p.id FROM profiles p WHERE p.org_id = o.id ORDER BY p.created_at ASC LIMIT 1
)
WHERE o.owner_user_id IS NULL;

-- Index for fast lookups by owner
CREATE INDEX IF NOT EXISTS idx_orgs_owner_user_id ON orgs(owner_user_id);

-- Allow members OR owner to read their orgs
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Members can view their org' AND tablename = 'orgs'
  ) THEN
    DROP POLICY "Members can view their org" ON orgs;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can read their org' AND tablename = 'orgs'
  ) THEN
    DROP POLICY "Users can read their org" ON orgs;
  END IF;
END $$;

CREATE POLICY "Users can view owned or member orgs"
  ON orgs FOR SELECT
  TO authenticated
  USING (
    owner_user_id = auth.uid()
    OR id IN (SELECT org_id FROM profiles WHERE profiles.id = auth.uid())
  );

-- INSERT: any authenticated user may create an org they own
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can create their own org' AND tablename = 'orgs'
  ) THEN
    CREATE POLICY "Users can create their own org"
      ON orgs FOR INSERT
      TO authenticated
      WITH CHECK (owner_user_id = auth.uid());
  END IF;
END $$;

-- DELETE: only owner may delete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Owner can delete their org' AND tablename = 'orgs'
  ) THEN
    CREATE POLICY "Owner can delete their org"
      ON orgs FOR DELETE
      TO authenticated
      USING (owner_user_id = auth.uid());
  END IF;
END $$;

-- Enforce at-least-one-org guard via trigger
CREATE OR REPLACE FUNCTION prevent_last_org_deletion()
RETURNS TRIGGER AS $$
DECLARE
  remaining_count int;
BEGIN
  IF OLD.owner_user_id IS NULL THEN
    RETURN OLD;
  END IF;
  SELECT COUNT(*) INTO remaining_count
  FROM orgs
  WHERE owner_user_id = OLD.owner_user_id
    AND id <> OLD.id;
  IF remaining_count = 0 THEN
    RAISE EXCEPTION 'Cannot delete the last remaining organization for this user';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_last_org_deletion ON orgs;
CREATE TRIGGER trg_prevent_last_org_deletion
  BEFORE DELETE ON orgs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_last_org_deletion();
