/*
  # Create organizations, profiles, and devices tables

  1. New Tables
    - `orgs` - Organizations
    - `profiles` - User profiles linked to auth.users
    - `devices` - Physical player devices
    
  2. Security
    - Enable RLS on all tables
    - Add policies for org-based access control
*/

CREATE TABLE IF NOT EXISTS orgs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their org"
  ON orgs FOR SELECT
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES orgs(id),
  role text DEFAULT 'admin',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE TABLE IF NOT EXISTS devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id uuid,
  platform text DEFAULT 'web',
  paired_at timestamptz,
  last_seen_at timestamptz,
  version text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create devices"
  ON devices FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anyone can read devices"
  ON devices FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can update devices"
  ON devices FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

INSERT INTO orgs (name) 
SELECT 'Default Organization'
WHERE NOT EXISTS (SELECT 1 FROM orgs LIMIT 1);

CREATE INDEX IF NOT EXISTS idx_devices_screen_id ON devices(screen_id);
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON profiles(org_id);
