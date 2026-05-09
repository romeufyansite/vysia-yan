/*
  # Add updated_at column to playlists

  1. Changes
    - Add `updated_at` column to playlists table
    - Add `updated_at` column to playlist_items table if missing
    
  2. Notes
    - Sets default to current timestamp
    - Backfills existing records with created_at value
*/

-- Add updated_at to playlists if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'playlists' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE playlists ADD COLUMN updated_at timestamptz DEFAULT now();
    UPDATE playlists SET updated_at = created_at WHERE updated_at IS NULL;
  END IF;
END $$;

-- Add updated_at to playlist_items if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'playlist_items' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE playlist_items ADD COLUMN updated_at timestamptz DEFAULT now();
    UPDATE playlist_items SET updated_at = created_at WHERE updated_at IS NULL;
  END IF;
END $$;
