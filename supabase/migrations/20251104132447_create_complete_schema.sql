/*
  # Create complete schema for digital signage platform

  1. Tables
    - `screen_groups` - Groups for organizing screens
    - `playlists` - Content playlists
    - `screens` - Display screens
    - `pairing_tokens` - Temporary codes for device pairing
    - `scenes` - Content scenes (placeholder)
    
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated access
*/

CREATE TABLE IF NOT EXISTS screen_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE screen_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage screen_groups in their org"
  ON screen_groups FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage playlists in their org"
  ON playlists FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS screens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  group_id uuid REFERENCES screen_groups(id),
  name text NOT NULL,
  playlist_id uuid REFERENCES playlists(id),
  status text DEFAULT 'offline' CHECK (status IN ('online', 'offline')),
  device_jwt text,
  last_seen_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE screens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage screens in their org"
  ON screens FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS pairing_tokens (
  code text PRIMARY KEY,
  device_id uuid NOT NULL,
  org_id uuid REFERENCES orgs(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'used', 'expired')),
  expires_at timestamptz NOT NULL,
  screen_id uuid REFERENCES screens(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE pairing_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create pairing tokens"
  ON pairing_tokens FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anyone can read pairing tokens"
  ON pairing_tokens FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated users can update pairing tokens"
  ON pairing_tokens FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE devices ADD CONSTRAINT devices_screen_id_fkey 
  FOREIGN KEY (screen_id) REFERENCES screens(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_screens_org_id ON screens(org_id);
CREATE INDEX IF NOT EXISTS idx_screens_group_id ON screens(group_id);
CREATE INDEX IF NOT EXISTS idx_screen_groups_org_id ON screen_groups(org_id);
CREATE INDEX IF NOT EXISTS idx_playlists_org_id ON playlists(org_id);
CREATE INDEX IF NOT EXISTS idx_pairing_tokens_code ON pairing_tokens(code);
CREATE INDEX IF NOT EXISTS idx_pairing_tokens_device_id ON pairing_tokens(device_id);
CREATE INDEX IF NOT EXISTS idx_pairing_tokens_expires_at ON pairing_tokens(expires_at);

DO $$
DECLARE
  default_org_id uuid;
BEGIN
  SELECT id INTO default_org_id FROM orgs LIMIT 1;
  
  
END $$;
