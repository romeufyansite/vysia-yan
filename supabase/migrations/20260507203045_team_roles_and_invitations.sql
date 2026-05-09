/*
  # Team roles, memberships, and invitations

  1. New tables
    - `org_memberships(user_id, org_id, role, permissions)` — role is 'manager' or 'teammate'.
      UNIQUE(user_id, org_id); UNIQUE per-org manager via partial index.
    - `team_invitations(email, org_id, invited_by, permissions, token, status, expires_at, accepted_at)` — token-based invite flow.
  2. Profiles
    - Add `platform_role text DEFAULT 'user'` ('admin' for back-office users).
  3. Backfill
    - Each existing org owner becomes its `manager` membership.
  4. Security
    - RLS on both tables.
    - Memberships: managers of an org can view/insert/update/delete teammate rows
      of that org; users can always view their own membership rows.
    - Invitations: managers of the org manage invites; a public SELECT policy
      limited by token is used from the acceptance page (anon can read row by
      matching token via edge function — we gate SELECT to authenticated only
      and expose invitation lookup through a SECURITY DEFINER RPC).
*/

-- ── profiles: platform_role ──
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'platform_role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN platform_role text NOT NULL DEFAULT 'user';
  END IF;
END $$;

-- ── org_memberships ──
CREATE TABLE IF NOT EXISTS org_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('manager','teammate')),
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, org_id)
);

-- Ensure only one manager per org
CREATE UNIQUE INDEX IF NOT EXISTS uq_one_manager_per_org
  ON org_memberships(org_id) WHERE role = 'manager';

CREATE INDEX IF NOT EXISTS idx_org_memberships_user ON org_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_org ON org_memberships(org_id);

ALTER TABLE org_memberships ENABLE ROW LEVEL SECURITY;

-- Backfill: every org owner becomes manager
INSERT INTO org_memberships (user_id, org_id, role, permissions)
SELECT o.owner_user_id, o.id, 'manager', '{}'::jsonb
FROM orgs o
WHERE o.owner_user_id IS NOT NULL
ON CONFLICT (user_id, org_id) DO UPDATE SET role = 'manager';

-- Helper to check if current user is manager of a given org
CREATE OR REPLACE FUNCTION public.is_org_manager(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_memberships
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
      AND role = 'manager'
  );
$$;

-- Policies
DROP POLICY IF EXISTS "Users can view their memberships" ON org_memberships;
CREATE POLICY "Users can view their memberships"
  ON org_memberships FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_org_manager(org_id)
  );

DROP POLICY IF EXISTS "Managers can insert teammates" ON org_memberships;
CREATE POLICY "Managers can insert teammates"
  ON org_memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    -- self-insert as manager when creating an org
    (user_id = auth.uid() AND role = 'manager')
    -- managers can add teammates
    OR (role = 'teammate' AND public.is_org_manager(org_id))
  );

DROP POLICY IF EXISTS "Managers can update teammates" ON org_memberships;
CREATE POLICY "Managers can update teammates"
  ON org_memberships FOR UPDATE
  TO authenticated
  USING (public.is_org_manager(org_id) AND role = 'teammate')
  WITH CHECK (public.is_org_manager(org_id) AND role = 'teammate');

DROP POLICY IF EXISTS "Managers can delete teammates" ON org_memberships;
CREATE POLICY "Managers can delete teammates"
  ON org_memberships FOR DELETE
  TO authenticated
  USING (public.is_org_manager(org_id) AND role = 'teammate');

-- ── team_invitations ──
CREATE TABLE IF NOT EXISTS team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','expired')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_invitations_org ON team_invitations(org_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(lower(email));

ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers can view invitations" ON team_invitations;
CREATE POLICY "Managers can view invitations"
  ON team_invitations FOR SELECT
  TO authenticated
  USING (public.is_org_manager(org_id));

DROP POLICY IF EXISTS "Managers can create invitations" ON team_invitations;
CREATE POLICY "Managers can create invitations"
  ON team_invitations FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_manager(org_id) AND invited_by = auth.uid());

DROP POLICY IF EXISTS "Managers can update invitations" ON team_invitations;
CREATE POLICY "Managers can update invitations"
  ON team_invitations FOR UPDATE
  TO authenticated
  USING (public.is_org_manager(org_id))
  WITH CHECK (public.is_org_manager(org_id));

DROP POLICY IF EXISTS "Managers can delete invitations" ON team_invitations;
CREATE POLICY "Managers can delete invitations"
  ON team_invitations FOR DELETE
  TO authenticated
  USING (public.is_org_manager(org_id));

-- ── accept_team_invitation RPC ──
-- Used by the acceptance page: consumes a token (matching caller's email),
-- creates the teammate membership, marks invitation accepted. SECURITY DEFINER
-- so it bypasses RLS safely with explicit checks.
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

  -- Prevent manager of same org from being demoted to teammate
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

  -- Switch the user's current org to the newly-joined one
  UPDATE profiles SET org_id = v_invite.org_id WHERE id = v_user_id;

  RETURN v_invite.org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_team_invitation(text) TO authenticated;

-- Fetch invitation metadata by token for the acceptance screen, without leaking
-- data across tokens. Returns org name + inviter email + expiry.
CREATE OR REPLACE FUNCTION public.get_invitation_preview(p_token text)
RETURNS TABLE (
  email text,
  org_id uuid,
  org_name text,
  inviter_email text,
  status text,
  expires_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.email, i.org_id, o.name as org_name,
         u.email as inviter_email, i.status, i.expires_at
  FROM team_invitations i
  LEFT JOIN orgs o ON o.id = i.org_id
  LEFT JOIN auth.users u ON u.id = i.invited_by
  WHERE i.token = p_token;
$$;

GRANT EXECUTE ON FUNCTION public.get_invitation_preview(text) TO anon, authenticated;

-- Expand orgs SELECT policy so teammates of an org can read it
DROP POLICY IF EXISTS "Users can view owned or member orgs" ON orgs;
CREATE POLICY "Users can view owned or member orgs"
  ON orgs FOR SELECT
  TO authenticated
  USING (
    owner_user_id = auth.uid()
    OR id IN (SELECT org_id FROM profiles WHERE profiles.id = auth.uid())
    OR id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid())
  );

-- Update handle_new_user: when a user signs up, don't auto-attach to first org.
-- If they have no org, leave org_id null. They'll either create one
-- or accept an invite. However, to keep the existing "first user becomes
-- manager of a default org" pattern, we keep that behaviour but only for
-- users that do not arrive via an invitation (invitations are handled post-signup).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
BEGIN
  -- Always ensure a profile exists
  INSERT INTO public.profiles (id, org_id, role, platform_role)
  VALUES (NEW.id, NULL, 'admin', 'user')
  ON CONFLICT (id) DO NOTHING;

  -- If the user signed up with an explicit invitation token we don't create an org
  -- (handled via accept_team_invitation RPC).
  IF (NEW.raw_user_meta_data ? 'invitation_token') THEN
    RETURN NEW;
  END IF;

  -- Otherwise, provision an org for them and make them manager
  INSERT INTO public.orgs (name, owner_user_id)
  VALUES ('Mon entreprise', NEW.id)
  RETURNING id INTO new_org_id;

  INSERT INTO public.org_memberships (user_id, org_id, role)
  VALUES (NEW.id, new_org_id, 'manager')
  ON CONFLICT DO NOTHING;

  UPDATE public.profiles SET org_id = new_org_id WHERE id = NEW.id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;
