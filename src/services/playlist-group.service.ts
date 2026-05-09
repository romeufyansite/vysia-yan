import { supabase } from '@/lib/supabase';
import type { PlaylistGroup } from '@/types';

export const playlistGroupService = {
  async getAll() {
    const { data, error } = await supabase
      .from('playlist_groups')
      .select('*')
      .order('name');

    if (error) throw error;
    return data as PlaylistGroup[];
  },

  async create(name: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.org_id) throw new Error('Organization not found');

    const { data, error } = await supabase
      .from('playlist_groups')
      .insert({ name, org_id: profile.org_id })
      .select()
      .single();

    if (error) throw error;
    return data as PlaylistGroup;
  },

  async update(id: string, name: string) {
    const { data, error } = await supabase
      .from('playlist_groups')
      .update({ name })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as PlaylistGroup;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('playlist_groups')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
