/*
  # Add pairing tokens table for screen activation

  1. New Tables
    - `pairing_tokens`
      - `id` (uuid, primary key)
      - `code` (text, unique) - 4 character pairing code
      - `device_id` (uuid) - unique device identifier
      - `status` (text) - pending, accepted, expired
      - `screen_id` (uuid, nullable) - linked screen after pairing
      - `expires_at` (timestamptz) - expiration time (10 minutes)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Updates to existing tables
    - Add `device_jwt` column to screens table
    - Add `last_seen_at` column to screens table for heartbeat tracking

  3. Security
    - Enable RLS on `pairing_tokens` table
    - Add policies for pairing token operations
*/

CREATE TABLE IF NOT EXISTS pairing_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  device_id uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  screen_id uuid,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE pairing_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create pairing tokens"
  ON pairing_tokens FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anyone can read pairing tokens by code"
  ON pairing_tokens FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated users can update pairing tokens"
  ON pairing_tokens FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'screens' AND column_name = 'device_jwt'
  ) THEN
    ALTER TABLE screens ADD COLUMN device_jwt text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'screens' AND column_name = 'last_seen_at'
  ) THEN
    ALTER TABLE screens ADD COLUMN last_seen_at timestamptz;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pairing_tokens_code ON pairing_tokens(code);
CREATE INDEX IF NOT EXISTS idx_pairing_tokens_device_id ON pairing_tokens(device_id);
CREATE INDEX IF NOT EXISTS idx_pairing_tokens_expires_at ON pairing_tokens(expires_at);
