/*
  # Add color and transition to playlists

  1. Changes
    - Add 'color' column to store the schedule color (hex format)
    - Add 'transition_speed' column to store transition settings
  
  2. Notes
    - Default color is blue (#4c67f3)
    - Default transition speed is 'instant'
    - Possible transition speeds: instant, slow, medium, fast
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'playlists' AND column_name = 'color'
  ) THEN
    ALTER TABLE playlists ADD COLUMN color text DEFAULT '#4c67f3';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'playlists' AND column_name = 'transition_speed'
  ) THEN
    ALTER TABLE playlists ADD COLUMN transition_speed text DEFAULT 'instant';
  END IF;
END $$;
