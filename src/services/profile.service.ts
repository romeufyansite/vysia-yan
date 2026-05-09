import { supabase } from '@/lib/supabase';

export interface Profile {
  id: string;
  org_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  updated_at: string;
  created_at: string;
}

export interface UpdateProfileData {
  first_name: string;
  last_name: string;
  phone?: string | null;
}

export const profileService = {
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async updateProfile(userId: string, updates: UpdateProfileData): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateEmail(newEmail: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) throw error;
  },

  async updatePassword(currentPassword: string, newPassword: string): Promise<void> {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user?.email) {
      throw new Error("Impossible de vérifier l'identité de l'utilisateur");
    }

    const { error: reAuthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (reAuthError) {
      throw new Error('Mot de passe actuel incorrect');
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },
};
