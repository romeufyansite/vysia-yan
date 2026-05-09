/*
  # Add orientation to playlists

  ## Summary
  Adds an `orientation` column to the `playlists` table to allow playlists to be
  configured as landscape or portrait. This drives the preview player aspect ratio,
  the playlist editor canvas proportions, and filters which playlists can be assigned
  to screens (a screen can only receive a playlist of matching orientation).

  ## Changes
  - `playlists.orientation` (text, default 'landscape') — either 'landscape' or 'portrait'

  ## Notes
  - Existing playlists default to 'landscape' to preserve current behaviour.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'playlists' AND column_name = 'orientation'
  ) THEN
    ALTER TABLE playlists ADD COLUMN orientation text NOT NULL DEFAULT 'landscape'
      CHECK (orientation IN ('landscape', 'portrait'));
  END IF;
END $$;
