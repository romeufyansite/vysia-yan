/*
  # Fix cascade delete constraints for proper cleanup

  ## Problem
  Foreign key constraints were set to ON DELETE SET NULL, which prevented proper cleanup
  when screens are deleted. This caused orphaned records in devices and pairing_tokens.

  ## Solution
  Change foreign key constraints to ON DELETE CASCADE so that:
    - When a screen is deleted, all associated devices are automatically deleted
    - When a screen is deleted, all associated pairing_tokens are automatically deleted

  ## Changes
    1. Drop existing foreign key constraints on devices.screen_id and pairing_tokens.screen_id
    2. Add new constraints with ON DELETE CASCADE
    3. Remove the now-unnecessary trigger (CASCADE handles this automatically)
*/

ALTER TABLE devices
  DROP CONSTRAINT IF EXISTS devices_screen_id_fkey;

ALTER TABLE devices
  ADD CONSTRAINT devices_screen_id_fkey 
  FOREIGN KEY (screen_id) 
  REFERENCES screens(id) 
  ON DELETE CASCADE;

ALTER TABLE pairing_tokens
  DROP CONSTRAINT IF EXISTS pairing_tokens_screen_id_fkey;

ALTER TABLE pairing_tokens
  ADD CONSTRAINT pairing_tokens_screen_id_fkey 
  FOREIGN KEY (screen_id) 
  REFERENCES screens(id) 
  ON DELETE CASCADE;

DROP TRIGGER IF EXISTS trigger_cleanup_screen_data ON screens;
DROP FUNCTION IF EXISTS cleanup_screen_data();
