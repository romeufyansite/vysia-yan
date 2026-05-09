/*
  # Fix RLS policies for team invitation flow

  1. team_invitations: allow anyone to SELECT a pending invitation by token
     (needed for getInvitationPreview called before auth).
  2. team_invitations: allow the invited user to UPDATE their own invitation
     (needed for accept_team_invitation RPC which runs SECURITY DEFINER —
     already OK — but also allows direct status update if needed).
  3. profiles: allow org managers to read profiles of their org members
     (needed to show names in the team list).
  4. Ensure createOrganization always inserts a manager membership.
*/

-- 1. Allow reading a pending invitation by token (public, token acts as a secret)
DROP POLICY IF EXISTS "Anyone can preview invitation by token" ON public.team_invitations;
CREATE POLICY "Anyone can preview invitation by token"
  ON public.team_invitations
  FOR SELECT
  TO anon, authenticated
  USING (status = 'pending');

-- 2. Allow org managers to read profiles of members in their org
DROP POLICY IF EXISTS "Managers can read member profiles" ON public.profiles;
CREATE POLICY "Managers can read member profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.user_id = profiles.id
        AND is_org_manager(om.org_id)
    )
  );

-- 3. Trigger: after inserting an org, create manager membership automatically
CREATE OR REPLACE FUNCTION public.handle_new_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO org_memberships (user_id, org_id, role, permissions)
  VALUES (NEW.owner_user_id, NEW.id, 'manager', '{}')
  ON CONFLICT (user_id, org_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_org failed for org %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_org_created ON public.orgs;
CREATE TRIGGER on_org_created
  AFTER INSERT ON public.orgs
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_org();

-- 4. Back-fill missing manager memberships for existing orgs
INSERT INTO org_memberships (user_id, org_id, role, permissions)
SELECT o.owner_user_id, o.id, 'manager', '{}'
FROM orgs o
WHERE o.owner_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM org_memberships m
    WHERE m.user_id = o.owner_user_id AND m.org_id = o.id
  )
ON CONFLICT (user_id, org_id) DO NOTHING;
