-- Align UPDATE on `orgs` with app logic (`canManageOrg`):
-- previously only rows where profiles.org_id = org.id matched, so managers of an org
-- whose profile "current org" pointed elsewhere got SELECT but no UPDATE.

CREATE OR REPLACE FUNCTION public.can_manage_org_company(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM orgs o
    WHERE o.id = p_org_id AND o.owner_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM org_memberships m
    WHERE m.org_id = p_org_id
      AND m.user_id = auth.uid()
      AND (
        m.role = 'manager'
        OR coalesce((m.permissions -> 'company' ->> 'manage')::boolean, false) = true
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_manage_org_company(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.can_manage_org_company(uuid) TO authenticated;

DROP POLICY IF EXISTS "Members can update their org" ON orgs;
CREATE POLICY "Owners or company managers can update org"
  ON orgs FOR UPDATE
  TO authenticated
  USING (public.can_manage_org_company(id))
  WITH CHECK (public.can_manage_org_company(id));
