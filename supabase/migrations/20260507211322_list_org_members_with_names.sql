CREATE OR REPLACE FUNCTION public.list_org_members(p_org_id uuid)
RETURNS TABLE (
  membership_id uuid,
  user_id uuid,
  email text,
  role text,
  permissions jsonb,
  created_at timestamptz,
  first_name text,
  last_name text
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
    SELECT m.id, m.user_id, u.email::text, m.role, m.permissions, m.created_at,
           p.first_name, p.last_name
    FROM org_memberships m
    LEFT JOIN auth.users u ON u.id = m.user_id
    LEFT JOIN profiles p ON p.id = m.user_id
    WHERE m.org_id = p_org_id
    ORDER BY m.created_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_org_members(uuid) TO authenticated;
