/*
  # Création du système de groupes de playlists

  1. Nouvelle table `playlist_groups`
    - `id` (uuid, clé primaire)
    - `org_id` (uuid) : organisation à laquelle appartient le groupe
    - `name` (text) : nom du groupe
    - `created_at` (timestamptz) : date de création

  2. Modifications de la table `playlists`
    - Ajout de `group_id` (uuid, nullable) : référence vers le groupe

  3. Sécurité
    - RLS activé sur `playlist_groups`
    - Policies : les utilisateurs peuvent voir/créer/modifier/supprimer les groupes de leur organisation

  4. Notes
    - Les playlists peuvent être sans groupe (group_id null)
    - Suppression d'un groupe : les playlists passent en "sans groupe" (ON DELETE SET NULL)
*/

CREATE TABLE IF NOT EXISTS playlist_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE playlist_groups ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'playlists' AND column_name = 'group_id'
  ) THEN
    ALTER TABLE playlists ADD COLUMN group_id uuid REFERENCES playlist_groups(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_playlist_groups_org_id ON playlist_groups(org_id);
CREATE INDEX IF NOT EXISTS idx_playlists_group_id ON playlists(group_id);

DROP POLICY IF EXISTS "Users can view groups of their org" ON playlist_groups;
CREATE POLICY "Users can view groups of their org"
  ON playlist_groups FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert groups in their org" ON playlist_groups;
CREATE POLICY "Users can insert groups in their org"
  ON playlist_groups FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update groups of their org" ON playlist_groups;
CREATE POLICY "Users can update groups of their org"
  ON playlist_groups FOR UPDATE
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete groups of their org" ON playlist_groups;
CREATE POLICY "Users can delete groups of their org"
  ON playlist_groups FOR DELETE
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );