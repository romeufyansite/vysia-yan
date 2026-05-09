/*
  # Add first_name / last_name to team_invitations
*/
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_invitations' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE public.team_invitations ADD COLUMN first_name text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_invitations' AND column_name = 'last_name'
  ) THEN
    ALTER TABLE public.team_invitations ADD COLUMN last_name text;
  END IF;
END $$;
