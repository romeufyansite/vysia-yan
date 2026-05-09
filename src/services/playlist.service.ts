import { supabase } from '@/lib/supabase';
import type { Playlist, PlaylistItem } from '@/types';

export const playlistService = {
  async getAll() {
    const { data, error } = await supabase
      .from('playlists')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data as Playlist[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('playlists')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as Playlist | null;
  },

  async create(name: string, options?: { color?: string; transition_speed?: string; group_id?: string | null; orientation?: 'landscape' | 'portrait' }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (!profile?.org_id) throw new Error('Organization not found');

    const { data, error } = await supabase
      .from('playlists')
      .insert({
        name,
        org_id: profile.org_id,
        color: options?.color || '#4c67f3',
        transition_speed: options?.transition_speed || 'instant',
        group_id: options?.group_id ?? null,
        orientation: options?.orientation || 'landscape',
      })
      .select()
      .single();

    if (error) throw error;
    return data as Playlist;
  },

  async update(id: string, updates: Partial<Playlist>) {
    const { data, error } = await supabase
      .from('playlists')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Playlist;
  },

  async delete(id: string) {
    await supabase
      .from('screens')
      .update({ playlist_id: null })
      .eq('playlist_id', id);

    const { error } = await supabase
      .from('playlists')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getScreensUsingPlaylist(id: string) {
    const { data, error } = await supabase
      .from('screens')
      .select('id, name')
      .eq('playlist_id', id);

    if (error) throw error;
    return data as { id: string; name: string }[];
  },

  async duplicate(id: string) {
    const playlist = await this.getById(id);
    if (!playlist) throw new Error('Playlist not found');

    const items = await this.getItems(id);
    const newPlaylist = await this.create(`${playlist.name} (copie)`, {
      color: playlist.color,
      transition_speed: playlist.transition_speed,
    });

    for (const item of items) {
      await this.addItem(newPlaylist.id, {
        app_type: item.app_type,
        order_index: item.order_index,
        config: item.config,
        duration: item.duration,
      });
    }

    return newPlaylist;
  },

  async getItems(playlistId: string) {
    const { data, error } = await supabase
      .from('playlist_items')
      .select('*')
      .eq('playlist_id', playlistId)
      .order('order_index');

    if (error) throw error;
    return data as PlaylistItem[];
  },

  async addItem(playlistId: string, item: Partial<PlaylistItem>) {
    const { data, error } = await supabase
      .from('playlist_items')
      .insert({
        playlist_id: playlistId,
        ...item,
      })
      .select()
      .single();

    if (error) throw error;
    return data as PlaylistItem;
  },

  async updateItem(id: string, updates: Partial<PlaylistItem>) {
    const { data, error } = await supabase
      .from('playlist_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as PlaylistItem;
  },

  async deleteItem(id: string) {
    const { error } = await supabase
      .from('playlist_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async reorderItems(items: { id: string; order_index: number }[]) {
    for (const item of items) {
      await this.updateItem(item.id, { order_index: item.order_index });
    }
  },
};
