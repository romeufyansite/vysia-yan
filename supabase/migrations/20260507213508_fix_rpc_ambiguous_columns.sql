/*
  # Fix ambiguous column references in list_team and accept_team_invitation

  The PL/pgSQL functions used column names that conflict with OUT parameters in
  RETURNS TABLE declarations (user_id, email, etc.), causing "column reference
  is ambiguous" errors at runtime. Fixed by prefixing all table references with
  table aliases and using explicit casts / qualifications.
*/

-- Drop and recreate list_team with unambiguous column names
DROP FUNCTION IF EXISTS public.list_team(uuid);

CREATE OR REPLACE FUNCTION public.list_team(p_org_id uuid)
RETURNS TABLE (
  kind        text,
  row_id      uuid,
  member_user_id uuid,
  member_email text,
  member_first_name text,
  member_last_name text,
  member_role text,
  member_permissions jsonb,
  member_status text,
  row_created_at timestamptz,
  row_expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM org_memberships _cm
    WHERE _cm.org_id = p_org_id AND _cm.user_id = v_caller AND _cm.role = 'manager'
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
    SELECT
      'member'::text,
      m.id,
      m.user_id,
      u.email::text,
      pf.first_name,
      pf.last_name,
      m.role,
      m.permissions,
      'active'::text,
      m.created_at,
      NULL::timestamptz
    FROM org_memberships m
    LEFT JOIN auth.users u ON u.id = m.user_id
    LEFT JOIN profiles pf ON pf.id = m.user_id
    WHERE m.org_id = p_org_id
    UNION ALL
    SELECT
      'invitation'::text,
      inv.id,
      NULL::uuid,
      inv.email,
      inv.first_name,
      inv.last_name,
      'teammate'::text,
      inv.permissions,
      inv.status,
      inv.created_at,
      inv.expires_at
    FROM team_invitations inv
    WHERE inv.org_id = p_org_id AND inv.status = 'pending'
    ORDER BY row_created_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_team(uuid) TO authenticated;

-- Also fix accept_team_invitation: rename loop variable to avoid collision
CREATE OR REPLACE FUNCTION public.accept_team_invitation(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     uuid;
  v_user_email  text;
  v_invite      team_invitations%ROWTYPE;
  v_first_org   uuid := NULL;
  v_first_name  text;
  v_last_name   text;
  v_cleanup_org uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT u.email INTO v_user_email FROM auth.users u WHERE u.id = v_user_id;

  -- Validate at least one pending invite exists for this token
  IF NOT EXISTS (SELECT 1 FROM team_invitations ti WHERE ti.token = p_token AND ti.status = 'pending') THEN
    RAISE EXCEPTION 'invitation_not_found';
  END IF;

  FOR v_invite IN
    SELECT * FROM team_invitations ti2 WHERE ti2.token = p_token FOR UPDATE
  LOOP
    IF v_invite.status <> 'pending' THEN
      CONTINUE;
    END IF;

    IF v_invite.expires_at < now() THEN
      UPDATE team_invitations SET status = 'expired' WHERE id = v_invite.id;
      CONTINUE;
    END IF;

    IF lower(v_invite.email) <> lower(coalesce(v_user_email, '')) THEN
      RAISE EXCEPTION 'invitation_email_mismatch';
    END IF;

    -- Skip orgs where caller is already manager
    IF EXISTS (
      SELECT 1 FROM org_memberships _om
      WHERE _om.user_id = v_user_id AND _om.org_id = v_invite.org_id AND _om.role = 'manager'
    ) THEN
      UPDATE team_invitations SET status = 'revoked' WHERE id = v_invite.id;
      CONTINUE;
    END IF;

    INSERT INTO org_memberships (user_id, org_id, role, permissions)
    VALUES (v_user_id, v_invite.org_id, 'teammate', coalesce(v_invite.permissions, '{}'::jsonb))
    ON CONFLICT (user_id, org_id) DO UPDATE
      SET role = 'teammate',
          permissions = EXCLUDED.permissions,
          updated_at = now();

    UPDATE team_invitations
      SET status = 'accepted', accepted_at = now()
    WHERE id = v_invite.id;

    IF v_first_org IS NULL THEN
      v_first_org   := v_invite.org_id;
      v_first_name  := v_invite.first_name;
      v_last_name   := v_invite.last_name;
    END IF;
  END LOOP;

  IF v_first_org IS NULL THEN
    RAISE EXCEPTION 'no_valid_invitation';
  END IF;

  -- Clean up any empty auto-created orgs owned by the invitee
  FOR v_cleanup_org IN
    SELECT _m.org_id
    FROM org_memberships _m
    JOIN orgs _o ON _o.id = _m.org_id
    WHERE _m.user_id = v_user_id
      AND _m.role = 'manager'
      AND _o.owner_user_id = v_user_id
      AND NOT EXISTS (SELECT 1 FROM screens _s WHERE _s.org_id = _m.org_id)
      AND NOT EXISTS (SELECT 1 FROM playlists _p WHERE _p.org_id = _m.org_id)
      AND NOT EXISTS (SELECT 1 FROM media_assets _a WHERE _a.org_id = _m.org_id)
      AND (SELECT count(*) FROM org_memberships _om2 WHERE _om2.org_id = _m.org_id) = 1
  LOOP
    DELETE FROM orgs WHERE id = v_cleanup_org;
  END LOOP;

  -- Set the primary org + optionally backfill name
  UPDATE profiles
    SET org_id = v_first_org,
        first_name = CASE
          WHEN coalesce(first_name, '') = '' AND v_first_name IS NOT NULL
            THEN v_first_name ELSE first_name END,
        last_name = CASE
          WHEN coalesce(last_name, '') = '' AND v_last_name IS NOT NULL
            THEN v_last_name ELSE last_name END
    WHERE id = v_user_id;

  RETURN v_first_org;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_team_invitation(text) TO authenticated;
