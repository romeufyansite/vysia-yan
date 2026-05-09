import { supabase } from '@/lib/supabase';
import type { PermissionMap } from '@/lib/permissions';

export interface TeamRow {
  kind: 'member' | 'invitation';
  id: string;
  user_id: string | null;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: 'manager' | 'teammate';
  permissions: PermissionMap;
  status: string;
  created_at: string;
  expires_at: string | null;
}

export const teamService = {
  async listTeam(orgId: string): Promise<TeamRow[]> {
    const [membersRes, invitesRes] = await Promise.all([
      supabase
        .from('org_memberships')
        .select('id, user_id, role, permissions, created_at')
        .eq('org_id', orgId)
        .order('created_at', { ascending: true }),
      supabase
        .from('team_invitations')
        .select('id, email, first_name, last_name, permissions, created_at, expires_at')
        .eq('org_id', orgId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true }),
    ]);

    if (membersRes.error) throw membersRes.error;
    if (invitesRes.error) throw invitesRes.error;

    const memberRows = (membersRes.data ?? []) as Array<{
      id: string; user_id: string; role: string; permissions: PermissionMap; created_at: string;
    }>;

    // Fetch profile info for each member
    let profileMap: Record<string, { first_name: string | null; last_name: string | null }> = {};
    if (memberRows.length > 0) {
      const userIds = memberRows.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);
      for (const p of profiles ?? []) {
        profileMap[(p as { id: string }).id] = p as { first_name: string | null; last_name: string | null };
      }
    }

    // Use the RPC list_org_members to get emails (it has SECURITY DEFINER access to auth.users)
    let emailMap: Record<string, string> = {};
    try {
      const { data: members } = await supabase.rpc('list_org_members', { p_org_id: orgId });
      for (const m of members ?? []) {
        const row = m as { user_id: string; email: string };
        if (row.user_id && row.email) emailMap[row.user_id] = row.email;
      }
    } catch {
      // fallback: no email display
    }

    const members: TeamRow[] = memberRows.map((m) => ({
      kind: 'member' as const,
      id: m.id,
      user_id: m.user_id,
      email: emailMap[m.user_id] ?? null,
      first_name: profileMap[m.user_id]?.first_name ?? null,
      last_name: profileMap[m.user_id]?.last_name ?? null,
      role: m.role as 'manager' | 'teammate',
      permissions: (m.permissions ?? {}) as PermissionMap,
      status: 'active',
      created_at: m.created_at,
      expires_at: null,
    }));

    const invites: TeamRow[] = (invitesRes.data ?? []).map((inv: {
      id: string; email: string; first_name: string | null; last_name: string | null;
      permissions: PermissionMap; created_at: string; expires_at: string;
    }) => ({
      kind: 'invitation' as const,
      id: inv.id,
      user_id: null,
      email: inv.email,
      first_name: inv.first_name,
      last_name: inv.last_name,
      role: 'teammate' as const,
      permissions: (inv.permissions ?? {}) as PermissionMap,
      status: 'pending',
      created_at: inv.created_at,
      expires_at: inv.expires_at,
    }));

    return [...members, ...invites];
  },

  async sendInvitation(params: {
    email: string;
    firstName: string;
    lastName: string;
    orgPermissions: Record<string, PermissionMap>;
  }): Promise<{ ok: boolean; inviteUrl: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Non authentifié');

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/team-invite`;
    const appBaseUrl = `${window.location.origin}${window.location.pathname}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: params.email,
        firstName: params.firstName,
        lastName: params.lastName,
        orgPermissions: params.orgPermissions,
        appBaseUrl,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || "Échec de l'envoi de l'invitation");
    }
    return response.json();
  },

  async revokeInvitation(invitationId: string): Promise<void> {
    const { error } = await supabase
      .from('team_invitations')
      .update({ status: 'revoked' })
      .eq('id', invitationId);
    if (error) throw error;
  },

  async updateInvitationPermissions(invitationId: string, permissions: PermissionMap): Promise<void> {
    const { error } = await supabase
      .from('team_invitations')
      .update({ permissions })
      .eq('id', invitationId);
    if (error) throw error;
  },

  async updateMembershipPermissions(membershipId: string, permissions: PermissionMap): Promise<void> {
    const { error } = await supabase
      .from('org_memberships')
      .update({ permissions, updated_at: new Date().toISOString() })
      .eq('id', membershipId);
    if (error) throw error;
  },

  async removeMember(membershipId: string): Promise<void> {
    const { error } = await supabase.from('org_memberships').delete().eq('id', membershipId);
    if (error) throw error;
  },

  async getInvitationPreview(token: string) {
    const { data, error } = await supabase
      .from('team_invitations')
      .select('id, email, org_id, status, expires_at, first_name, last_name, orgs(name)')
      .eq('token', token)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return null;

    const rows = (data as unknown) as Array<{
      id: string;
      email: string;
      org_id: string;
      status: string;
      expires_at: string;
      first_name: string | null;
      last_name: string | null;
      orgs: { name: string } | null;
    }>;

    const first = rows[0];
    return {
      email: first.email,
      org_id: first.org_id,
      org_name: first.orgs?.name ?? '',
      org_names: rows.map((r) => r.orgs?.name ?? '').filter(Boolean),
      inviter_email: null as string | null,
      status: first.status,
      expires_at: first.expires_at,
      first_name: first.first_name,
      last_name: first.last_name,
    };
  },

  async acceptInvitation(token: string): Promise<string> {
    const { data, error } = await supabase.rpc('accept_team_invitation', { p_token: token });
    if (error) throw error;
    return data as string;
  },
};
