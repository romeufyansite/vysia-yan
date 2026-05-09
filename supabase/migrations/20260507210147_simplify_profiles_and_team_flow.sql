/*
  # Simplify profile roles and fix teammate invitation flow

  1. Changes on profiles
    - Drop unused `profiles.role` column. The only role we rely on is
      `platform_role` (admin | user). Org-level role lives in
      `org_memberships.role`.
  2. handle_new_user trigger
    - Remove the automatic creation of a new organisation on sign-up. This
      caused two issues:
        a. Teammates invited via email were receiving an empty auto-created
           org instead of joining the inviter's org.
        b. Even when metadata carried `invitation_token`, racing with the
           email confirmation step could flip the user into the wrong org.
    - Now the trigger only ensures a profiles row exists. The client is in
      charge of calling either:
        - `public.bootstrap_manager_org()` — for regular sign-ups
        - `public.accept_team_invitation(token)` — for invited teammates
  3. bootstrap_manager_org RPC
    - Creates one org for the caller (if none) and their manager membership.
      Safe to call multiple times (idempotent: no-op when the caller already
      has an org_id set on their profile).
  4. accept_team_invitation
    - Unchanged name/signature. Already clears/sets profiles.org_id to the
      joined org. Also deletes any empty "auto-created" org the caller may
      have been attached to.
*/

-- 1) Drop profiles.role safely
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles DROP COLUMN role;
  END IF;
END $$;

-- 2) Simpler trigger: only ensure the profile exists. No org side-effects.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, org_id, platform_role)
  VALUES (NEW.id, NULL, 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- 3) RPC to bootstrap an org + manager membership for a brand new sign-up.
CREATE OR REPLACE FUNCTION public.bootstrap_manager_org(p_org_name text DEFAULT 'Mon entreprise')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_existing_org uuid;
  v_new_org uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- If the user already belongs to any org via membership, do nothing, just
  -- return that org id.
  SELECT org_id INTO v_existing_org
  FROM org_memberships
  WHERE user_id = v_user
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_existing_org IS NOT NULL THEN
    UPDATE profiles SET org_id = v_existing_org WHERE id = v_user AND org_id IS NULL;
    RETURN v_existing_org;
  END IF;

  INSERT INTO orgs (name, owner_user_id) VALUES (p_org_name, v_user)
  RETURNING id INTO v_new_org;

  INSERT INTO org_memberships (user_id, org_id, role)
  VALUES (v_user, v_new_org, 'manager')
  ON CONFLICT DO NOTHING;

  UPDATE profiles SET org_id = v_new_org WHERE id = v_user;

  RETURN v_new_org;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bootstrap_manager_org(text) TO authenticated;

-- 4) Harden accept_team_invitation: remove any stray empty auto-created org.
CREATE OR REPLACE FUNCTION public.accept_team_invitation(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite team_invitations%ROWTYPE;
  v_email text;
  v_user_id uuid;
  v_current_org uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;

  SELECT * INTO v_invite FROM team_invitations WHERE token = p_token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invitation_not_found';
  END IF;

  IF v_invite.status <> 'pending' THEN
    RAISE EXCEPTION 'invitation_already_%', v_invite.status;
  END IF;

  IF v_invite.expires_at < now() THEN
    UPDATE team_invitations SET status = 'expired' WHERE id = v_invite.id;
    RAISE EXCEPTION 'invitation_expired';
  END IF;

  IF lower(v_invite.email) <> lower(coalesce(v_email,'')) THEN
    RAISE EXCEPTION 'invitation_email_mismatch';
  END IF;

  IF EXISTS (
    SELECT 1 FROM org_memberships
    WHERE user_id = v_user_id AND org_id = v_invite.org_id AND role = 'manager'
  ) THEN
    RAISE EXCEPTION 'user_is_already_manager';
  END IF;

  INSERT INTO org_memberships (user_id, org_id, role, permissions)
  VALUES (v_user_id, v_invite.org_id, 'teammate', coalesce(v_invite.permissions, '{}'::jsonb))
  ON CONFLICT (user_id, org_id) DO UPDATE
    SET role = EXCLUDED.role, permissions = EXCLUDED.permissions, updated_at = now();

  UPDATE team_invitations
    SET status = 'accepted', accepted_at = now()
    WHERE id = v_invite.id;

  -- Clean up any empty auto-created org the user was manager of (in case a
  -- previous version of the trigger provisioned one). We delete the org only
  -- if it has no screens/playlists/media and the user is its sole member.
  FOR v_current_org IN
    SELECT m.org_id
    FROM org_memberships m
    JOIN orgs o ON o.id = m.org_id
    WHERE m.user_id = v_user_id
      AND m.role = 'manager'
      AND o.owner_user_id = v_user_id
      AND m.org_id <> v_invite.org_id
      AND NOT EXISTS (SELECT 1 FROM screens s WHERE s.org_id = m.org_id)
      AND NOT EXISTS (SELECT 1 FROM playlists p WHERE p.org_id = m.org_id)
      AND NOT EXISTS (SELECT 1 FROM media_assets a WHERE a.org_id = m.org_id)
      AND (SELECT count(*) FROM org_memberships om2 WHERE om2.org_id = m.org_id) = 1
  LOOP
    DELETE FROM orgs WHERE id = v_current_org;
  END LOOP;

  UPDATE profiles SET org_id = v_invite.org_id WHERE id = v_user_id;

  RETURN v_invite.org_id;
END;
$$;
