import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { PermissionMap, Resource, Action } from '@/lib/permissions';
import { can as checkPermission } from '@/lib/permissions';
import { useAuth } from './AuthContext';

interface CurrentMembership {
  orgId: string;
  role: 'manager' | 'teammate';
  permissions: PermissionMap;
  platformRole: 'admin' | 'user';
}

interface MembershipContextType {
  membership: CurrentMembership | null;
  loading: boolean;
  can: (resource: Resource, action?: Action) => boolean;
  refresh: () => Promise<void>;
}

const MembershipContext = createContext<MembershipContextType | undefined>(undefined);

export function MembershipProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [membership, setMembership] = useState<CurrentMembership | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setMembership(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id, platform_role')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.org_id) {
        setMembership({
          orgId: '',
          role: 'manager',
          permissions: {},
          platformRole: (profile?.platform_role as 'admin' | 'user') ?? 'user',
        });
        return;
      }

      const { data: m } = await supabase
        .from('org_memberships')
        .select('role, permissions')
        .eq('user_id', user.id)
        .eq('org_id', profile.org_id)
        .maybeSingle();

      setMembership({
        orgId: profile.org_id,
        role: (m?.role as 'manager' | 'teammate') ?? 'manager',
        permissions: (m?.permissions as PermissionMap) ?? {},
        platformRole: (profile.platform_role as 'admin' | 'user') ?? 'user',
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const can = useCallback(
    (resource: Resource, action: Action = 'view') => {
      if (!membership) return false;
      return checkPermission(membership.role, membership.permissions, resource, action);
    },
    [membership],
  );

  return (
    <MembershipContext.Provider value={{ membership, loading, can, refresh: load }}>
      {children}
    </MembershipContext.Provider>
  );
}

export function useMembership() {
  const ctx = useContext(MembershipContext);
  if (!ctx) throw new Error('useMembership must be used within a MembershipProvider');
  return ctx;
}
