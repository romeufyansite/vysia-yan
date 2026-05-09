/*
  # Restrict RLS policies to the user's current organization

  1. Problem
    - `screens`, `screen_groups`, `playlists` had permissive policies
      (`USING (true)` or `FOR ALL qual=true`, plus "Public can view ..." rows)
      which leaked data across organizations. Switching org in the UI
      still returned screens/playlists from other orgs.
  2. Changes
    - Drop permissive / public policies on `screens`, `screen_groups`,
      `playlists`.
    - Re-create tight SELECT/INSERT/UPDATE/DELETE policies on each table,
      scoped to the caller's current `profiles.org_id`.
  3. Security
    - All tables remain RLS-enabled.
    - Every policy now checks that the row's `org_id` matches the caller's
      current org from `profiles`.
*/

-- ─────────────────────── screens ───────────────────────
DROP POLICY IF EXISTS "Users can manage screens in their org" ON screens;
DROP POLICY IF EXISTS "Public can view screens" ON screens;

CREATE POLICY "Users can view their org's screens"
  ON screens FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM profiles WHERE profiles.id = auth.uid())
  );

CREATE POLICY "Users can create screens for their org"
  ON screens FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (SELECT org_id FROM profiles WHERE profiles.id = auth.uid())
  );

CREATE POLICY "Users can update their org's screens"
  ON screens FOR UPDATE
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM profiles WHERE profiles.id = auth.uid())
  )
  WITH CHECK (
    org_id IN (SELECT org_id FROM profiles WHERE profiles.id = auth.uid())
  );

CREATE POLICY "Users can delete their org's screens"
  ON screens FOR DELETE
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM profiles WHERE profiles.id = auth.uid())
  );

-- ─────────────────────── screen_groups ───────────────────────
DROP POLICY IF EXISTS "Users can manage screen_groups in their org" ON screen_groups;
DROP POLICY IF EXISTS "Public can view screen_groups" ON screen_groups;

CREATE POLICY "Users can view their org's screen groups"
  ON screen_groups FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM profiles WHERE profiles.id = auth.uid())
  );

CREATE POLICY "Users can create screen groups for their org"
  ON screen_groups FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (SELECT org_id FROM profiles WHERE profiles.id = auth.uid())
  );

CREATE POLICY "Users can update their org's screen groups"
  ON screen_groups FOR UPDATE
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM profiles WHERE profiles.id = auth.uid())
  )
  WITH CHECK (
    org_id IN (SELECT org_id FROM profiles WHERE profiles.id = auth.uid())
  );

CREATE POLICY "Users can delete their org's screen groups"
  ON screen_groups FOR DELETE
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM profiles WHERE profiles.id = auth.uid())
  );

-- ─────────────────────── playlists ───────────────────────
DROP POLICY IF EXISTS "Users can manage playlists in their org" ON playlists;
DROP POLICY IF EXISTS "Public can view playlists" ON playlists;
