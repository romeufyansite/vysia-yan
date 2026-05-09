/*
  # Rename playlist_items columns for consistency

  1. Changes
    - Rename `position` column to `order_index` for consistency with code
    - Rename `type` column to `app_type` for consistency with code

  2. Notes
    - This ensures the database schema matches the TypeScript interfaces
    - All existing data will be preserved
    - Indexes will be automatically updated
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'playlist_items' AND column_name = 'position'
  ) THEN
    ALTER TABLE playlist_items RENAME COLUMN position TO order_index;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'playlist_items' AND column_name = 'type'
  ) THEN
    ALTER TABLE playlist_items RENAME COLUMN type TO app_type;
  END IF;
END $$;
