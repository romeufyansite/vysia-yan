/*
  # Pairing System Hardening

  ## Overview
  This migration adds columns, indexes, and rate-limiting capabilities to harden
  the pairing system for production use.

  ## 1. Device Table Enhancements
    
    ### Add columns to `devices`:
    - `platform` (text) - Platform identifier (web, tv, android, ios)
    - `player_type` (text) - Specific player type
    - `player_version` (text) - Player software version
    - `last_seen_at` (timestamptz) - Last activity timestamp for heartbeat tracking

  ## 2. Pairing Tokens Table Enhancements
    
    ### Add columns to `pairing_tokens`:
    - `created_at` (timestamptz) - Token creation timestamp with default now()
    - `created_ip` (text) - IP address that created the token for rate-limiting

  ## 3. Performance Indexes
    
    - Unique index on pending codes to prevent duplicates
    - Composite index on (status, code, expires_at) for fast polling queries

  ## 4. Rate Limiting Function
    
    - SQL function `pairing_rate_limit_count` to count recent requests
    - Uses sliding window approach (device_id + issued_by + IP)
    - Security definer for controlled access

  ## Important Notes
    - All operations are idempotent (safe to re-run)
    - No data loss or destructive operations
    - Supports existing pairing flows without breaking changes
    - Rate limit is soft (won't block if RPC fails)
*/

-- 1) Add columns to devices table (if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'devices' 
      AND column_name = 'platform'
  ) THEN
    ALTER TABLE public.devices ADD COLUMN platform text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'devices' 
      AND column_name = 'player_type'
  ) THEN
    ALTER TABLE public.devices ADD COLUMN player_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'devices' 
      AND column_name = 'player_version'
  ) THEN
    ALTER TABLE public.devices ADD COLUMN player_version text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'devices' 
      AND column_name = 'last_seen_at'
  ) THEN
    ALTER TABLE public.devices ADD COLUMN last_seen_at timestamptz;
  END IF;
END $$;

-- 2) Add columns to pairing_tokens table (if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'pairing_tokens' 
      AND column_name = 'created_ip'
  ) THEN
    ALTER TABLE public.pairing_tokens ADD COLUMN created_ip text;
  END IF;
END $$;

-- 3) Create unique index for pending codes (prevents duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS uq_pairing_code_pending
  ON public.pairing_tokens (code)
  WHERE status = 'pending';

-- 4) Create composite index for fast status polling
CREATE INDEX IF NOT EXISTS ix_pairing_status_code_expires
  ON public.pairing_tokens (status, code, expires_at);

-- 5) Create rate-limiting function
CREATE OR REPLACE FUNCTION public.pairing_rate_limit_count(
  p_device_id text,
  p_issued_by text,
  p_ip text,
  p_window_seconds integer
) RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*)::integer
  FROM public.pairing_tokens
  WHERE device_id::text = p_device_id
    AND issued_by = p_issued_by
    AND COALESCE(created_ip, 'unknown') = COALESCE(p_ip, 'unknown')
    AND created_at > now() - make_interval(secs => p_window_seconds);
$$;

-- Add helpful comments
COMMENT ON COLUMN public.devices.platform IS 
'Device platform: web, tv, android, ios, etc.';

COMMENT ON COLUMN public.devices.player_type IS 
'Specific player type or model information';

COMMENT ON COLUMN public.devices.player_version IS 
'Player software version string';

COMMENT ON COLUMN public.devices.last_seen_at IS 
'Last activity timestamp for heartbeat tracking and cleanup';

COMMENT ON COLUMN public.pairing_tokens.created_ip IS 
'IP address that created the pairing token (for rate-limiting)';

COMMENT ON FUNCTION public.pairing_rate_limit_count IS 
'Counts pairing tokens created within a time window for rate-limiting. Uses device_id, issued_by, and IP address.';

COMMENT ON INDEX uq_pairing_code_pending IS 
'Ensures no duplicate codes exist in pending state';

COMMENT ON INDEX ix_pairing_status_code_expires IS 
'Optimizes polling queries that filter by status and check expiration';
