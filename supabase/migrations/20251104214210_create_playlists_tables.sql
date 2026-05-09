/*
  # Create playlists and playlist_items tables

  1. New Tables
    - `playlists`
      - `id` (uuid, primary key)
      - `org_id` (uuid, foreign key to orgs)
      - `name` (text, required)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `playlist_items`
      - `id` (uuid, primary key)
      - `playlist_id` (uuid, foreign key to playlists)
      - `position` (int, for ordering)
      - `type` (text, app type: image, image-slideshow, video, website)
      - `config` (jsonb, configuration data)
      - `duration` (int, optional duration in seconds)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their org's playlists
    
  3. Modifications to screens table
    - Add `playlist_id` column if not exists
    - Add `scene_version` column if not exists
*/

-- Create playlists table
CREATE TABLE IF NOT EXISTS playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create playlist_items table
CREATE TABLE IF NOT EXISTS playlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  position int NOT NULL,
  type text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  duration int,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add columns to screens table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'screens' AND column_name = 'playlist_id'
  ) THEN
    ALTER TABLE screens ADD COLUMN playlist_id uuid REFERENCES playlists(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'screens' AND column_name = 'scene_version'
  ) THEN
    ALTER TABLE screens ADD COLUMN scene_version int DEFAULT 0;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_items ENABLE ROW LEVEL SECURITY;

-- Policies for playlists
CREATE POLICY "Users can view their org's playlists"
  ON playlists FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.org_id = playlists.org_id
    )
  );

CREATE POLICY "Users can create playlists for their org"
  ON playlists FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.org_id = playlists.org_id
    )
  );

CREATE POLICY "Users can update their org's playlists"
  ON playlists FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.org_id = playlists.org_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.org_id = playlists.org_id
    )
  );

CREATE POLICY "Users can delete their org's playlists"
  ON playlists FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.org_id = playlists.org_id
    )
  );

-- Policies for playlist_items
CREATE POLICY "Users can view items of their org's playlists"
  ON playlist_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM playlists
      JOIN profiles ON profiles.org_id = playlists.org_id
      WHERE playlists.id = playlist_items.playlist_id
      AND profiles.id = auth.uid()
    )
  );

CREATE POLICY "Users can create items for their org's playlists"
  ON playlist_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM playlists
      JOIN profiles ON profiles.org_id = playlists.org_id
      WHERE playlists.id = playlist_items.playlist_id
      AND profiles.id = auth.uid()
    )
  );

CREATE POLICY "Users can update items of their org's playlists"
  ON playlist_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM playlists
      JOIN profiles ON profiles.org_id = playlists.org_id
      WHERE playlists.id = playlist_items.playlist_id
      AND profiles.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM playlists
      JOIN profiles ON profiles.org_id = playlists.org_id
      WHERE playlists.id = playlist_items.playlist_id
      AND profiles.id = auth.uid()
    )
  );

CREATE POLICY "Users can delete items of their org's playlists"
  ON playlist_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM playlists
      JOIN profiles ON profiles.org_id = playlists.org_id
      WHERE playlists.id = playlist_items.playlist_id
      AND profiles.id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_playlists_org_id ON playlists(org_id);
CREATE INDEX IF NOT EXISTS idx_playlist_items_playlist_id ON playlist_items(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_items_position ON playlist_items(playlist_id, position);
CREATE INDEX IF NOT EXISTS idx_screens_playlist_id ON screens(playlist_id);
