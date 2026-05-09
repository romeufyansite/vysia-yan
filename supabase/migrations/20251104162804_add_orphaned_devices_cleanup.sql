/*
  # Add cleanup function for orphaned devices

  ## Purpose
  Clean up devices that are:
    - Not paired (paired_at IS NULL)
    - Not linked to any active pairing token
    - Older than 1 hour

  ## Changes
    - Add function `cleanup_orphaned_devices()` to remove abandoned devices
    - Update cron job to also run this cleanup
*/

CREATE OR REPLACE FUNCTION cleanup_orphaned_devices()
RETURNS void AS $$
DECLARE
  orphaned_device RECORD;
BEGIN
  FOR orphaned_device IN 
    SELECT d.id, d.created_at
    FROM devices d
    WHERE d.paired_at IS NULL
      AND d.created_at < NOW() - INTERVAL '1 hour'
      AND NOT EXISTS (
        SELECT 1 FROM pairing_tokens pt 
        WHERE pt.device_id = d.id 
        AND pt.status = 'pending'
        AND pt.expires_at > NOW()
      )
  LOOP
    DELETE FROM devices WHERE id = orphaned_device.id;
    
    RAISE NOTICE 'Cleaned up orphaned device: % (created: %)', 
      orphaned_device.id, orphaned_device.created_at;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

SELECT cron.unschedule('cleanup-expired-tokens');

SELECT cron.schedule(
  'cleanup-expired-tokens',
  '0 * * * *',
  $$
  SELECT cleanup_expired_pending_tokens();
  SELECT cleanup_orphaned_devices();
  $$
);
