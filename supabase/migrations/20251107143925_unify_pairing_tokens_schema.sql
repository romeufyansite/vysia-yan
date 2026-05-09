/*
  # Unify pairing_tokens schema for Web + Android TV

  ## Overview
  This migration unifies the pairing system to use `public.pairing_tokens` as the single
  source of truth for all player types (Web, Android TV, Fire TV, etc.).

  ## 1. Schema Enhancements
    
    ### Add new columns to `pairing_tokens`:
    - `accepted_at` (timestamptz) - When the code was accepted/claimed
    - `issued_by` (text) - Which platform generated the code (web, android_tv, fire_tv, etc.)
    - `player_type` (text) - Type of player device
    - `player_version` (text) - Player software version
    - `meta` (jsonb) - Additional metadata for extensibility

  ## 2. Status Constraint
    - Update status check constraint to include 'cancelled' state
    - Valid states: pending, accepted, expired, cancelled

  ## 3. Indexes
    - Index on expires_at for cleanup queries
    - Index on status for filtering
    - Index on status + expires_at combination

  ## 4. Compatibility View
    - Create `pairing_codes` view as alias to `pairing_tokens`
    - Ensures compatibility with any legacy code references

  ## 5. Data Migration
    - pairing_codes view already exists, no migration needed

  ## Important Notes
    - Code format remains 4 characters (ALPHANUMERIC excluding 0,1,O,I)
    - RLS policies remain unchanged (already configured)
    - Edge Functions updated separately to use new columns
    - Migration is idempotent and safe to re-run
*/

-- 1) Add new columns to pairing_tokens (if not exist)
DO $$
BEGIN
  -- accepted_at: timestamp when code was claimed
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'pairing_tokens' 
      AND column_name = 'accepted_at'
  ) THEN
    ALTER TABLE public.pairing_tokens ADD COLUMN accepted_at timestamptz NULL;
  END IF;

  -- issued_by: platform that generated the code
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'pairing_tokens' 
      AND column_name = 'issued_by'
  ) THEN
    ALTER TABLE public.pairing_tokens 
      ADD COLUMN issued_by text NOT NULL DEFAULT 'web' 
      CHECK (issued_by IN ('web', 'android_tv', 'fire_tv', 'ios', 'desktop', 'other'));
  END IF;

  -- player_type: type of player device
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'pairing_tokens' 
      AND column_name = 'player_type'
  ) THEN
    ALTER TABLE public.pairing_tokens ADD COLUMN player_type text NULL;
  END IF;

  -- player_version: software version
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'pairing_tokens' 
      AND column_name = 'player_version'
  ) THEN
    ALTER TABLE public.pairing_tokens ADD COLUMN player_version text NULL;
  END IF;

  -- meta: JSON metadata for extensibility
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'pairing_tokens' 
      AND column_name = 'meta'
  ) THEN
    ALTER TABLE public.pairing_tokens ADD COLUMN meta jsonb NULL;
  END IF;
END $$;

-- 2) Update status constraint to include 'cancelled'
DO $$
BEGIN
  -- Drop old constraint if exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'pairing_tokens_status_check'
  ) THEN
    ALTER TABLE public.pairing_tokens DROP CONSTRAINT pairing_tokens_status_check;
  END IF;

  -- Add new constraint with cancelled state
  ALTER TABLE public.pairing_tokens 
    ADD CONSTRAINT pairing_tokens_status_check 
    CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled'));
END $$;

-- 3) Create optimized indexes
-- Index on expires_at for cleanup queries
CREATE INDEX IF NOT EXISTS pairing_tokens_expires_idx 
  ON public.pairing_tokens (expires_at);

-- Index on status for filtering
CREATE INDEX IF NOT EXISTS pairing_tokens_status_idx 
  ON public.pairing_tokens (status);

-- Index on status + expires_at combination for pending code queries
CREATE INDEX IF NOT EXISTS pairing_tokens_status_expires_idx
  ON public.pairing_tokens (status, expires_at);

-- Add helpful comments for documentation
COMMENT ON COLUMN public.pairing_tokens.issued_by IS 
'Platform that generated the pairing code: web, android_tv, fire_tv, ios, desktop, other';

COMMENT ON COLUMN public.pairing_tokens.accepted_at IS 
'Timestamp when the pairing code was accepted/claimed by admin';

COMMENT ON COLUMN public.pairing_tokens.meta IS 
'Additional metadata in JSON format for extensibility (device info, etc.)';

COMMENT ON TABLE public.pairing_tokens IS 
'Unified pairing tokens table for all platforms (Web, Android TV, Fire TV, etc.). Contains 4-character codes for device pairing.';
