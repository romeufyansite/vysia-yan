import { supabase } from '@/lib/supabase';
import type { Screen } from '@/types';

export const screenService = {
  async getAll() {
    const { data, error } = await supabase
      .from('screens')
      .select(`
        *,
        playlist:playlists(*),
        screen_group:screen_groups(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Screen[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('screens')
      .select(`
        *,
        playlist:playlists(*),
        screen_group:screen_groups(*)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as Screen | null;
  },

  async create(screen: Partial<Screen>) {
    const { data, error } = await supabase
      .from('screens')
      .insert(screen)
      .select(`
        *,
        playlist:playlists(*),
        screen_group:screen_groups(*)
      `)
      .single();

    if (error) throw error;
    return data as Screen;
  },

  async update(id: string, updates: Partial<Screen>) {
    const { playlist, screen_group, ...cleanUpdates } = updates as any;
    const { data, error } = await supabase
      .from('screens')
      .update(cleanUpdates)
      .eq('id', id)
      .select(`
        *,
        playlist:playlists(*),
        screen_group:screen_groups(*)
      `)
      .single();

    if (error) throw error;
    return data as Screen;
  },

  async delete(id: string) {
    console.log('[screenService.delete] Deleting screen:', id);
    const { error, data } = await supabase
      .from('screens')
      .delete()
      .eq('id', id)
      .select();

    console.log('[screenService.delete] Result:', { error, data });
    if (error) {
      console.error('[screenService.delete] Error:', error);
      throw error;
    }
    console.log('[screenService.delete] Successfully deleted screen');
    return data;
  },
};
