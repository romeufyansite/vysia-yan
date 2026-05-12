import { supabase } from '@/lib/supabase';
import type { CompanyDescriptionAiProfile } from '@/types/company-description-ai';

type PgLikeError = { code: string; message: string; details?: string; hint?: string };

function isSupabasePgError(error: unknown): error is PgLikeError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  );
}

/** User-facing hints for branding/org PATCH failures */
function describeOrgPatchError(error: unknown): string {
  if (isSupabasePgError(error)) {
    if (error.code === 'PGRST204') {
      return (
        error.message ||
        'La colonne demandée est absente du schéma. Appliquez les migrations (ex. brand_fonts sur orgs) dans Supabase.'
      );
    }
    if (/violates not-null constraint/i.test(error.message) && /company_description_ai/i.test(error.message)) {
      return (
        error.message ||
        'Impossible d’enregistrer une valeur vide pour la synthèse IA (contrainte NOT NULL sur company_description_ai).'
      );
    }
    if (
      (/PGRST204/.test(error.code) ||
        /could not find.*column|column.*does not exist/i.test(error.message)) &&
      /company_description/i.test(error.message)
    ) {
      return (
        'Colonnes description manquantes sur la table orgs. Appliquez les migrations Supabase ' +
        '(company_description, company_description_ai), fichier ' +
        '`supabase/migrations/20260512180000_org_company_description_ai.sql`.'
      );
    }
    if (/schema cache|'brand_fonts'|could not find.*column/i.test(error.message)) {
      return (
        'Colonnes branding manquantes côté base (ex. brand_fonts). Exécutez les migrations locales sur le projet Supabase ' +
        "ou le SQL suivant dans l'éditeur SQL : ALTER TABLE orgs ADD COLUMN IF NOT EXISTS brand_fonts jsonb NOT NULL DEFAULT '[]'::jsonb;"
      );
    }
    if (error.code === 'PGRST116') {
      return "Enregistrement refusé (aucune ligne mise à jour). Vérifiez vos droits sur cette organisation ou que le projet utilise la politique RLS à jour.";
    }
    return error.message || 'Erreur lors de la mise à jour';
  }
  if (error instanceof Error) return error.message;
  return 'Erreur lors de la mise à jour';
}

export interface BrandColor {
  id: string;
  name: string;
  hex: string;
}

export interface BrandFont {
  id: string;
  /** Libellé métier (ex. « Titres ») */
  name: string;
  /** Stack CSS (ex. `'Inter', sans-serif`) ou famille custom uploadée */
  family: string;
  /** Fichier importé (woff2, woff, ttf, otf) — URL publique Supabase Storage */
  font_file_url?: string | null;
  /** Nom logique @font-face (aligné sur la famille entre guillemets dans `family`) */
  custom_face_family?: string | null;
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
  brand_fonts: BrandFont[];
  owner_user_id: string | null;
  created_at: string;
  updated_at: string;
  company_description?: string | null;
  company_description_ai?: CompanyDescriptionAiProfile | Record<string, unknown>;
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
  brand_fonts?: BrandFont[];
}

export interface OrganizationDescriptionUpdate {
  company_description?: string | null;
  company_description_ai?: CompanyDescriptionAiProfile | Record<string, unknown> | null;
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
    updates: OrganizationInfoUpdate | OrganizationBrandingUpdate | OrganizationDescriptionUpdate,
  ): Promise<Organization> {
    const { data, error } = await supabase
      .from('orgs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', orgId)
      .select()
      .single();
    if (error) throw new Error(describeOrgPatchError(error));
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

  async uploadBrandFontFile(orgId: string, file: File): Promise<string> {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const allowed = ['woff2', 'woff', 'ttf', 'otf'] as const;
    if (!allowed.includes(ext as (typeof allowed)[number])) {
      throw new Error('Formats acceptés : WOFF2, WOFF, TTF, OTF');
    }
    const fallbackMime: Record<(typeof allowed)[number], string> = {
      woff2: 'font/woff2',
      woff: 'font/woff',
      ttf: 'font/ttf',
      otf: 'font/otf',
    };
    const contentType = file.type || fallbackMime[ext as (typeof allowed)[number]];
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const path = `${orgId}/fonts/${stamp}.${ext}`;
    const { error } = await supabase.storage.from('media').upload(path, file, {
      upsert: false,
      contentType,
    });
    if (error) throw error;
    const { data } = supabase.storage.from('media').getPublicUrl(path);
    return data.publicUrl;
  },
};
