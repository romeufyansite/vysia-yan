/*
  # Add device_type field to screens table

  1. Changes
    - Add `device_type` column to `screens` table
      - Possible values: 'connected_tv', 'web_browser', 'non_connected_tv'
      - Default value: 'connected_tv'
    
  2. Notes
    - This allows tracking the type of device for each screen
    - Used to display the appropriate label in the UI
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'screens' AND column_name = 'device_type'
  ) THEN
    ALTER TABLE screens ADD COLUMN device_type text DEFAULT 'connected_tv' 
      CHECK (device_type IN ('connected_tv', 'web_browser', 'non_connected_tv'));
  END IF;
END $$;