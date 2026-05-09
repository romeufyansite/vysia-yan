import { supabase } from '@/lib/supabase';
import type { MediaFolder, MediaAsset } from '@/types';

export const mediaLibraryService = {
  async getFolders(parentId: string | null = null) {
    const { data, error } = await supabase
      .from('media_folders')
      .select('*')
      .is('parent_id', parentId)
      .order('name');

    if (error) throw error;
    return data as MediaFolder[];
  },

  async createFolder(name: string, parentId: string | null = null) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (!profile?.org_id) throw new Error('Organization not found');

    const { data, error } = await supabase
      .from('media_folders')
      .insert({
        name,
        parent_id: parentId,
        org_id: profile.org_id,
      })
      .select()
      .single();

    if (error) throw error;
    return data as MediaFolder;
  },

  async updateFolder(id: string, updates: Partial<MediaFolder>) {
    const { data, error } = await supabase
      .from('media_folders')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as MediaFolder;
  },

  async deleteFolder(id: string) {
    const { error } = await supabase
      .from('media_folders')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getAssets(folderId: string | null = null) {
    const { data, error } = await supabase
      .from('media_assets')
      .select('*')
      .is('folder_id', folderId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as MediaAsset[];
  },

  async createAsset(asset: Omit<MediaAsset, 'id' | 'org_id' | 'created_at' | 'updated_at'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (!profile?.org_id) throw new Error('Organization not found');

    const { data, error } = await supabase
      .from('media_assets')
      .insert({
        ...asset,
        org_id: profile.org_id,
      })
      .select()
      .single();

    if (error) throw error;
    return data as MediaAsset;
  },

  async deleteAsset(id: string) {
    const { error } = await supabase
      .from('media_assets')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async uploadFile(file: File): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (!profile?.org_id) throw new Error('Organization not found');

    const fileExt = file.name.split('.').pop();
    const fileName = `${profile.org_id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(fileName);

    return publicUrl;
  },
};
