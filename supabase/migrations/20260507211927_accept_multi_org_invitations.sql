/*
  # Accept all invitations sharing a token (multi-org invites)

  A single email invitation can now grant access to multiple organisations at
  once: the edge function inserts one row per org with a shared token. The
  accept RPC loops through all pending rows for that token.
*/

CREATE OR REPLACE FUNCTION public.accept_team_invitation(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_invite team_invitations%ROWTYPE;
  v_first uuid := NULL;
  v_first_name text;
  v_last_name text;
  v_cleanup uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;

  FOR v_invite IN
    SELECT * FROM team_invitations WHERE token = p_token FOR UPDATE
  LOOP
    IF v_invite.status <> 'pending' THEN
      CONTINUE;
    END IF;

    IF v_invite.expires_at < now() THEN
      UPDATE team_invitations SET status = 'expired' WHERE id = v_invite.id;
      CONTINUE;
    END IF;

    IF lower(v_invite.email) <> lower(coalesce(v_email,'')) THEN
      RAISE EXCEPTION 'invitation_email_mismatch';
    END IF;

    IF EXISTS (
      SELECT 1 FROM org_memberships
      WHERE user_id = v_user_id AND org_id = v_invite.org_id AND role = 'manager'
    ) THEN
      -- skip orgs where user is already manager
      UPDATE team_invitations SET status = 'revoked' WHERE id = v_invite.id;
      CONTINUE;
    END IF;

    INSERT INTO org_memberships (user_id, org_id, role, permissions)
    VALUES (v_user_id, v_invite.org_id, 'teammate', coalesce(v_invite.permissions, '{}'::jsonb))
    ON CONFLICT (user_id, org_id) DO UPDATE
      SET role = EXCLUDED.role, permissions = EXCLUDED.permissions, updated_at = now();

    UPDATE team_invitations
      SET status = 'accepted', accepted_at = now()
      WHERE id = v_invite.id;

    IF v_first IS NULL THEN
      v_first := v_invite.org_id;
      v_first_name := v_invite.first_name;
      v_last_name := v_invite.last_name;
    END IF;
  END LOOP;

  IF v_first IS NULL THEN
    RAISE EXCEPTION 'invitation_not_found';
  END IF;

  -- Clean up empty auto-created orgs owned by the invitee
  FOR v_cleanup IN
    SELECT m.org_id
    FROM org_memberships m
    JOIN orgs o ON o.id = m.org_id
    WHERE m.user_id = v_user_id
      AND m.role = 'manager'
      AND o.owner_user_id = v_user_id
      AND NOT EXISTS (SELECT 1 FROM screens s WHERE s.org_id = m.org_id)
      AND NOT EXISTS (SELECT 1 FROM playlists p WHERE p.org_id = m.org_id)
      AND NOT EXISTS (SELECT 1 FROM media_assets a WHERE a.org_id = m.org_id)
      AND (SELECT count(*) FROM org_memberships om2 WHERE om2.org_id = m.org_id) = 1
  LOOP
    DELETE FROM orgs WHERE id = v_cleanup;
  END LOOP;

  UPDATE profiles
    SET org_id = v_first,
        first_name = CASE
          WHEN coalesce(first_name, '') = '' AND v_first_name IS NOT NULL
            THEN v_first_name ELSE first_name END,
        last_name = CASE
          WHEN coalesce(last_name, '') = '' AND v_last_name IS NOT NULL
            THEN v_last_name ELSE last_name END
    WHERE id = v_user_id;

  RETURN v_first;
END;
$$;

-- Helper for listing team members + pending invitations in one unified view.
CREATE OR REPLACE FUNCTION public.list_team(p_org_id uuid)
RETURNS TABLE (
  kind text,
  id uuid,
  user_id uuid,
  email text,
  first_name text,
  last_name text,
  role text,
  permissions jsonb,
  status text,
  created_at timestamptz,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM org_memberships
    WHERE org_id = p_org_id AND user_id = auth.uid() AND role = 'manager'
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
    SELECT 'member'::text as kind, m.id, m.user_id, u.email::text,
           p.first_name, p.last_name, m.role, m.permissions,
           'active'::text as status, m.created_at, NULL::timestamptz
    FROM org_memberships m
    LEFT JOIN auth.users u ON u.id = m.user_id
    LEFT JOIN profiles p ON p.id = m.user_id
    WHERE m.org_id = p_org_id
  UNION ALL
    SELECT 'invitation'::text, i.id, NULL::uuid, i.email,
           i.first_name, i.last_name, 'teammate'::text, i.permissions,
           i.status, i.created_at, i.expires_at
    FROM team_invitations i
    WHERE i.org_id = p_org_id AND i.status = 'pending'
  ORDER BY created_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_team(uuid) TO authenticated;
