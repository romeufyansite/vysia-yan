import { supabase } from '@/lib/supabase';
import type { ScreenGroup } from '@/types';

export const screenGroupService = {
  async getAll() {
    const { data, error } = await supabase
      .from('screen_groups')
      .select('*')
      .order('name');

    if (error) throw error;
    return data as ScreenGroup[];
  },

  async create(group: Partial<ScreenGroup>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (!profile?.org_id) throw new Error('Organization not found');

    const { data, error } = await supabase
      .from('screen_groups')
      .insert({
        ...group,
        org_id: profile.org_id,
      })
      .select()
      .single();

    if (error) throw error;
    return data as ScreenGroup;
  },

  async update(id: string, updates: Partial<ScreenGroup>) {
    const { data, error } = await supabase
      .from('screen_groups')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as ScreenGroup;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('screen_groups')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
