/*
  # Fix foreign key constraint on pairing_tokens table
  
  1. Changes
    - Drop existing foreign key constraint on pairing_tokens.screen_id
    - Recreate constraint with ON DELETE SET NULL to allow screen deletion
    
  2. Reasoning
    - When a screen is deleted, pairing tokens should remain but have their screen_id set to NULL
    - This prevents "foreign key violation" errors when deleting screens with associated pairing tokens
    - Pairing tokens are temporary and will be cleaned up by their expiration logic
*/

ALTER TABLE pairing_tokens 
  DROP CONSTRAINT IF EXISTS pairing_tokens_screen_id_fkey;

ALTER TABLE pairing_tokens
  ADD CONSTRAINT pairing_tokens_screen_id_fkey 
  FOREIGN KEY (screen_id) 
  REFERENCES screens(id) 
  ON DELETE SET NULL;
