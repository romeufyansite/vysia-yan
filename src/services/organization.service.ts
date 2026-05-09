import { supabase } from '@/lib/supabase';

export interface BrandColor {
  id: string;
  name: string;
  hex: string;
}

export interface Organization {
  id: string;
  name: string;
  legal_name: string | null;
  registration_number: string | null;
  vat_number: string | null;
  address_line1: string | null;
  address_line2: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  billing_email: string | null;
  billing_phone: string | null;
  logo_url: string | null;
  website: string | null;
  brand_colors: BrandColor[];
  owner_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationInfoUpdate {
  name?: string;
  legal_name?: string | null;
  registration_number?: string | null;
  vat_number?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
  billing_email?: string | null;
  billing_phone?: string | null;
}

export interface OrganizationBrandingUpdate {
  logo_url?: string | null;
  website?: string | null;
  brand_colors?: BrandColor[];
}

async function getCurrentOrgId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .maybeSingle();
  return data?.org_id ?? null;
}

export const organizationService = {
  async getCurrentOrganization(): Promise<Organization | null> {
    const orgId = await getCurrentOrgId();
    if (!orgId) return null;
    const { data, error } = await supabase
      .from('orgs')
      .select('*')
      .eq('id', orgId)
      .maybeSingle();
    if (error) throw error;
    return data as Organization | null;
  },

  async getById(orgId: string): Promise<Organization | null> {
    const { data, error } = await supabase
      .from('orgs')
      .select('*')
      .eq('id', orgId)
      .maybeSingle();
    if (error) throw error;
    return data as Organization | null;
  },

  async listMyOrganizations(): Promise<Organization[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: memberships, error: mErr } = await supabase
      .from('org_memberships')
      .select('org_id')
      .eq('user_id', user.id);
    if (mErr) throw mErr;

    const orgIds = new Set<string>((memberships ?? []).map((m: { org_id: string }) => m.org_id));

    const { data: owned, error: oErr } = await supabase
      .from('orgs')
      .select('*')
      .eq('owner_user_id', user.id);
    if (oErr) throw oErr;
    (owned as Organization[]).forEach((o) => orgIds.add(o.id));

    if (orgIds.size === 0) return [];

    const { data, error } = await supabase
      .from('orgs')
      .select('*')
      .in('id', Array.from(orgIds))
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data as Organization[]) || [];
  },

  async createOrganization(name: string): Promise<Organization> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');
    const { data, error } = await supabase
      .from('orgs')
      .insert({ name, owner_user_id: user.id })
      .select()
      .single();
    if (error) throw error;
    return data as Organization;
  },

  async switchCurrentOrganization(orgId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');
    const { error } = await supabase
      .from('profiles')
      .update({ org_id: orgId })
      .eq('id', user.id);
    if (error) throw error;
  },

  async deleteOrganization(orgId: string): Promise<void> {
    const { error } = await supabase.from('orgs').delete().eq('id', orgId);
    if (error) {
      if (error.message?.includes('last remaining organization')) {
        throw new Error("Impossible de supprimer la dernière entreprise");
      }
      throw error;
    }
  },

  async updateOrganization(
    orgId: string,
    updates: OrganizationInfoUpdate | OrganizationBrandingUpdate,
  ): Promise<Organization> {
    const { data, error } = await supabase
      .from('orgs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', orgId)
      .select()
      .single();
    if (error) throw error;
    return data as Organization;
  },

  async canManageOrg(orgId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data: org } = await supabase
      .from('orgs')
      .select('owner_user_id')
      .eq('id', orgId)
      .maybeSingle();
    if (org?.owner_user_id === user.id) return true;
    const { data: m } = await supabase
      .from('org_memberships')
      .select('role, permissions')
      .eq('user_id', user.id)
      .eq('org_id', orgId)
      .maybeSingle();
    if (!m) return false;
    if (m.role === 'manager') return true;
    const perms = m.permissions as { company?: { manage?: boolean } } | null;
    return !!perms?.company?.manage;
  },

  async uploadLogo(orgId: string, file: File): Promise<string> {
    const ext = file.name.split('.').pop() || 'png';
    const path = `${orgId}/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('media')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    const { data } = supabase.storage.from('media').getPublicUrl(path);
    return data.publicUrl;
  },
};
