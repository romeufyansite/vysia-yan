/*
  # Create Media Library Tables

  1. New Tables
    - `media_folders`
      - `id` (uuid, primary key)
      - `org_id` (uuid, foreign key to orgs)
      - `name` (text)
      - `parent_id` (uuid, nullable, self-referencing for nested folders)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `media_assets`
      - `id` (uuid, primary key)
      - `org_id` (uuid, foreign key to orgs)
      - `folder_id` (uuid, nullable, foreign key to media_folders)
      - `name` (text)
      - `file_url` (text)
      - `file_type` (text) - image, video, document
      - `file_size` (bigint) - size in bytes
      - `mime_type` (text)
      - `width` (integer, nullable)
      - `height` (integer, nullable)
      - `duration` (integer, nullable) - for videos in seconds
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their org's media
*/

CREATE TABLE IF NOT EXISTS media_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_id uuid REFERENCES media_folders(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  folder_id uuid REFERENCES media_folders(id) ON DELETE SET NULL,
  name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  width integer,
  height integer,
  duration integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE media_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view folders from their org"
  ON media_folders FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create folders in their org"
  ON media_folders FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update folders in their org"
  ON media_folders FOR UPDATE
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

CREATE POLICY "Users can delete folders in their org"
  ON media_folders FOR DELETE
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view assets from their org"
  ON media_assets FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create assets in their org"
  ON media_assets FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update assets in their org"
  ON media_assets FOR UPDATE
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

CREATE POLICY "Users can delete assets in their org"
  ON media_assets FOR DELETE
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_media_folders_org_id ON media_folders(org_id);
CREATE INDEX IF NOT EXISTS idx_media_folders_parent_id ON media_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_org_id ON media_assets(org_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_folder_id ON media_assets(folder_id);
