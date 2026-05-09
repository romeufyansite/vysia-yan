/*
  # Schéma initial pour l'application d'affichage dynamique

  ## Tables créées
  
  ### `screen_groups`
  - `id` (uuid, clé primaire)
  - `name` (text, nom du groupe)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### `playlists`
  - `id` (uuid, clé primaire)
  - `name` (text, nom de la playlist)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### `screens`
  - `id` (uuid, clé primaire)
  - `name` (text, nom de l'écran)
  - `pairing_code` (text, code d'appairage unique)
  - `status` (text, 'online' ou 'offline')
  - `last_activity` (timestamptz)
  - `orientation` (text, 'landscape' ou 'portrait')
  - `rotation` (text, 'normal', '90', '180', '270')
  - `presentation_mode` (boolean, mode présentation activé)
  - `playlist_id` (uuid, référence à playlists)
  - `screen_group_id` (uuid, référence à screen_groups)
  - `template` (text, template de zones)
  - `zones` (jsonb, configuration des zones)
  - `overlays` (jsonb, configuration des overlays)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Sécurité
  - Activation de RLS sur toutes les tables
  - Politiques permettant lecture/écriture authentifiée
*/

-- Créer la table screen_groups
CREATE TABLE IF NOT EXISTS screen_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Créer la table playlists
CREATE TABLE IF NOT EXISTS playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Créer la table screens
CREATE TABLE IF NOT EXISTS screens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  pairing_code text UNIQUE,
  status text DEFAULT 'offline' CHECK (status IN ('online', 'offline')),
  last_activity timestamptz DEFAULT now(),
  orientation text DEFAULT 'landscape' CHECK (orientation IN ('landscape', 'portrait')),
  rotation text DEFAULT 'normal' CHECK (rotation IN ('normal', '90', '180', '270')),
  presentation_mode boolean DEFAULT false,
  playlist_id uuid REFERENCES playlists(id) ON DELETE SET NULL,
  screen_group_id uuid REFERENCES screen_groups(id) ON DELETE SET NULL,
  template text DEFAULT 'fullscreen',
  zones jsonb DEFAULT '[]'::jsonb,
  overlays jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Activer RLS
ALTER TABLE screen_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE screens ENABLE ROW LEVEL SECURITY;

-- Politiques pour screen_groups
CREATE POLICY "Les utilisateurs authentifiés peuvent lire les groupes d'écrans"
  ON screen_groups FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Les utilisateurs authentifiés peuvent créer des groupes d'écrans"
  ON screen_groups FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Les utilisateurs authentifiés peuvent modifier les groupes d'écrans"
  ON screen_groups FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Les utilisateurs authentifiés peuvent supprimer les groupes d'écrans"
  ON screen_groups FOR DELETE
  TO authenticated
  USING (true);

-- Politiques pour playlists
CREATE POLICY "Les utilisateurs authentifiés peuvent lire les playlists"
  ON playlists FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Les utilisateurs authentifiés peuvent créer des playlists"
  ON playlists FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Les utilisateurs authentifiés peuvent modifier les playlists"
  ON playlists FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Les utilisateurs authentifiés peuvent supprimer les playlists"
  ON playlists FOR DELETE
  TO authenticated
  USING (true);

-- Politiques pour screens
CREATE POLICY "Les utilisateurs authentifiés peuvent lire les écrans"
  ON screens FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Les utilisateurs authentifiés peuvent créer des écrans"
  ON screens FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Les utilisateurs authentifiés peuvent modifier les écrans"
  ON screens FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Les utilisateurs authentifiés peuvent supprimer les écrans"
  ON screens FOR DELETE
  TO authenticated
  USING (true);

-- Insérer des données de test
INSERT INTO screen_groups (name) VALUES
  ('Tous'),
ON CONFLICT DO NOTHING;

INSERT INTO playlists (name) VALUES
  ('Union Cafe'),
  ('GymClub'),
  ('New playlist')
ON CONFLICT DO NOTHING;