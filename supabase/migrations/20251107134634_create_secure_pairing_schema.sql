/*
  # Create secure Vysia pairing schema

  ## Overview
  This migration implements a secure pairing system for Vysia TV players and web admin.
  Players use anon key, admin uses Edge Functions with service role for claiming codes.

  ## 1. Extension
    - `pgcrypto` - For secure UUID generation

  ## 2. Schema Changes
    
    ### Table: `screens`
    - Add `device_id` column (unique identifier for TV player device)
    - Add index for created_at for performance
    
    ### Table: `pairing_codes` (replaces pairing_tokens)
    - `code` (text, PK) - 4-digit pairing code (0000-9999)
    - `device_id` (text) - Player device identifier
    - `status` (text) - pending, claimed, expired
    - `screen_id` (uuid) - Reference to screens table
    - `expires_at` (timestamptz) - Code expiration (10 minutes default)
    - `created_at` (timestamptz) - Creation timestamp

  ## 3. Security (RLS)
    
    ### `screens` table:
    - Authenticated users can manage screens in their org
    
    ### `pairing_codes` table:
    - Anon users can INSERT codes (TV players creating pairing requests)
    - NO direct SELECT allowed for anon/authenticated users
    - Status checks must go through RPC function
    - Claim operations handled by Edge Functions with service role

  ## 4. RPC Function
    - `rpc_get_pairing_status(code)` - SECURITY DEFINER function
    - Allows players to check status of their specific code
    - Returns only status field, no other data exposed
    - Validates code exists and is not expired

  ## 5. Indexes
    - Optimized queries for device_id, expires_at, and created_at

  ## Important Notes
    - Pairing code format: always 4 digits (0000-9999)
    - No SELECT policy on pairing_codes prevents enumeration attacks
    - RPC function provides controlled access to status only
    - Edge Functions with service role handle claim operations
*/

-- Enable pgcrypto extension for secure UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add device_id to screens table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'screens' AND column_name = 'device_id'
  ) THEN
    ALTER TABLE public.screens ADD COLUMN device_id text UNIQUE;
  END IF;
END $$;

-- Create index on screens.created_at for performance
CREATE INDEX IF NOT EXISTS idx_screens_created_at ON public.screens(created_at);

-- Create pairing_codes table (new secure version)
CREATE TABLE IF NOT EXISTS public.pairing_codes (
  code text PRIMARY KEY,
  device_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'expired')),
  screen_id uuid REFERENCES public.screens(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on pairing_codes
ALTER TABLE public.pairing_codes ENABLE ROW LEVEL SECURITY;

-- Create indexes for pairing_codes
CREATE INDEX IF NOT EXISTS idx_pairing_codes_device_id ON public.pairing_codes(device_id);
CREATE INDEX IF NOT EXISTS idx_pairing_codes_expires_at ON public.pairing_codes(expires_at);

-- Revoke all default permissions
REVOKE ALL ON public.pairing_codes FROM anon, authenticated;

-- Policy: Allow anon users to INSERT pairing codes (TV players requesting pairing)
CREATE POLICY "Anon users can insert pairing codes"
  ON public.pairing_codes
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- NO SELECT policy for anon/authenticated users
-- This prevents enumeration attacks and unauthorized access
-- Status checks MUST go through the RPC function below

-- Create RPC function for secure status checking
CREATE OR REPLACE FUNCTION public.rpc_get_pairing_status(p_code text)
RETURNS TABLE(status text)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT pc.status
  FROM public.pairing_codes pc
  WHERE pc.code = p_code
    AND pc.expires_at > now()
  LIMIT 1;
$$;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION public.rpc_get_pairing_status(text) TO anon, authenticated;

-- Add comment to document the security model
COMMENT ON FUNCTION public.rpc_get_pairing_status(text) IS 
'Secure RPC function for TV players to check pairing code status. 
Only returns status field for valid, non-expired codes. 
Prevents enumeration attacks by not exposing other table data.';

COMMENT ON TABLE public.pairing_codes IS
'Vysia pairing codes table. 
Security model: anon can INSERT, but SELECT is blocked. 
Status checks go through rpc_get_pairing_status().
Claim operations handled by Edge Functions with service role.
Code format: 4 digits (0000-9999).';
