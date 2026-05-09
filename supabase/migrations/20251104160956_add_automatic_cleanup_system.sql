/*
  # Add automatic cleanup system for database optimization

  ## 1. Cascade Delete Trigger
  When a screen is deleted:
    - Automatically delete all associated devices
    - Automatically delete all associated pairing_tokens

  ## 2. Cleanup Function for Expired Tokens
  Automatically removes:
    - pairing_tokens with status 'pending' and expired (expires_at < now())
    - Associated devices that were created during pairing but never completed

  ## 3. Scheduled Cleanup with pg_cron
  Runs the cleanup function every hour to maintain database hygiene

  ## Changes
    - Add trigger function `cleanup_screen_data()` to cascade delete related data
    - Add cleanup function `cleanup_expired_pending_tokens()` for expired tokens
    - Enable pg_cron extension for scheduled tasks
    - Schedule hourly cleanup job
*/

CREATE OR REPLACE FUNCTION cleanup_screen_data()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM devices WHERE screen_id = OLD.id;
  
  DELETE FROM pairing_tokens WHERE screen_id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_screen_data
  BEFORE DELETE ON screens
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_screen_data();

CREATE OR REPLACE FUNCTION cleanup_expired_pending_tokens()
RETURNS void AS $$
DECLARE
  expired_token RECORD;
BEGIN
  FOR expired_token IN 
    SELECT pt.code, pt.device_id, pt.screen_id
    FROM pairing_tokens pt
    WHERE pt.status = 'pending'
      AND pt.expires_at < NOW()
  LOOP
    IF expired_token.device_id IS NOT NULL THEN
      DELETE FROM devices WHERE id = expired_token.device_id;
    END IF;
    
    DELETE FROM pairing_tokens WHERE code = expired_token.code;
    
    RAISE NOTICE 'Cleaned up expired pending token: % (device: %)', 
      expired_token.code, expired_token.device_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'cleanup-expired-tokens',
  '0 * * * *',
  $$SELECT cleanup_expired_pending_tokens();$$
);
