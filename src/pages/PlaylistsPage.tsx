import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, FolderPlus, Folder } from 'lucide-react';
import { playlistService } from '@/services/playlist.service';
import { playlistGroupService } from '@/services/playlist-group.service';
import type { Playlist, PlaylistGroup } from '@/types';
import { toast } from 'sonner';
import { PlaylistSettingsDialog } from '@/components/playlists/PlaylistSettingsDialog';
import { DeletePlaylistDialog } from '@/components/playlists/DeletePlaylistDialog';
import { PlaylistCard } from '@/components/playlists/PlaylistCard';
import { AddPlaylistCard } from '@/components/playlists/AddPlaylistCard';
import { CreateGroupDialog } from '@/components/playlists/CreateGroupDialog';
import { PlaylistPreviewModal } from '@/components/playlists/PlaylistPreviewModal';
import { useMembership } from '@/contexts/MembershipContext';

const UNGROUPED_KEY = '__ungrouped__';

export function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [groups, setGroups] = useState<PlaylistGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(null);
  const [screensUsingPlaylist, setScreensUsingPlaylist] = useState<string[]>([]);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [previewPlaylist, setPreviewPlaylist] = useState<Playlist | null>(null);
  const { can } = useMembership();
  const canManage = can('playlists', 'manage');

  useEffect(() => {
    loadData();

    const hash = window.location.hash;
    if (hash.includes('?create=true')) {
      setSettingsDialogOpen(true);
      window.history.replaceState(null, '', '#/playlists');
    }
  }, []);

  const loadData = async () => {
    try {
      const [playlistsData, groupsData] = await Promise.all([
        playlistService.getAll(),
        playlistGroupService.getAll(),
      ]);
      setPlaylists(playlistsData);
      setGroups(groupsData);
    } catch (error) {
      console.error('Error loading playlists:', error);
      toast.error('Erreur lors du chargement des playlists');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingPlaylist(null);
    setSettingsDialogOpen(true);
  };

  const handleSaveSettings = async (settings: { name: string; orientation: 'landscape' | 'portrait'; group_id: string | null }) => {
    try {
      if (editingPlaylist) {
        await playlistService.update(editingPlaylist.id, { name: settings.name, orientation: settings.orientation, group_id: settings.group_id });
        toast.success('Playlist mise à jour');
        loadData();
      } else {
        const playlist = await playlistService.create(settings.name, { group_id: settings.group_id, orientation: settings.orientation });
        toast.success('Playlist créée');
        window.location.hash = `/playlists/${playlist.id}`;
      }
    } catch (error) {
      console.error('Error saving playlist:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleGroupCreated = async () => {
    await loadData();
  };

  const handleEditSettings = (playlist: Playlist) => {
    setEditingPlaylist(playlist);
    setSettingsDialogOpen(true);
  };

  const handleDuplicate = async (playlist: Playlist) => {
    try {
      await playlistService.duplicate(playlist.id);
      toast.success('Playlist dupliquée');
      loadData();
    } catch (error) {
      console.error('Error duplicating playlist:', error);
      toast.error('Erreur lors de la duplication');
    }
  };

  const handleDelete = async (playlist: Playlist) => {
    try {
      const screens = await playlistService.getScreensUsingPlaylist(playlist.id);
      setScreensUsingPlaylist(screens.map((s) => s.name));
      setPlaylistToDelete(playlist);
      setDeleteDialogOpen(true);
    } catch (error) {
      console.error('Error checking playlist usage:', error);
      toast.error('Erreur lors de la vérification');
    }
  };

  const handleConfirmDelete = async () => {
    if (!playlistToDelete) return;

    try {
      await playlistService.delete(playlistToDelete.id);
      toast.success('Playlist supprimée');
      setDeleteDialogOpen(false);
      setPlaylistToDelete(null);
      setScreensUsingPlaylist([]);
      loadData();
    } catch (error) {
      console.error('Error deleting playlist:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const ungroupedCount = playlists.filter((p) => !p.group_id).length;
  const countByGroup = new Map<string, number>();
  for (const playlist of playlists) {
    const key = playlist.group_id || UNGROUPED_KEY;
    countByGroup.set(key, (countByGroup.get(key) || 0) + 1);
  }

  const filteredPlaylists =
    activeFilters.size === 0
      ? playlists
      : playlists.filter((p) => activeFilters.has(p.group_id || UNGROUPED_KEY));

  const toggleFilter = (key: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const clearFilters = () => setActiveFilters(new Set());

  const groupNameById = new Map(groups.map((g) => [g.id, g.name]));

  return (
    <div className="h-full">
      <div className="border-b border-slate-200 bg-white px-4 sm:px-8 py-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">Playlists</h1>
          {canManage && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setCreateGroupOpen(true)}
                className="rounded-xl h-10 border-slate-200"
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Nouveau groupe</span>
                <span className="sm:hidden">Groupe</span>
              </Button>
              <Button
                onClick={handleCreate}
                className="rounded-xl h-10 bg-slate-900 hover:bg-slate-800"
              >
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Nouvelle playlist</span>
                <span className="sm:hidden">Playlist</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-8">
        {loading ? (
          <div className="text-center py-12 text-slate-500">Chargement...</div>
        ) : playlists.length === 0 && groups.length === 0 ? (
          <EmptyState onCreate={canManage ? handleCreate : undefined} />
        ) : (
          <div className="space-y-6">
            {(groups.length > 0 || ungroupedCount > 0) && (
              <div className="flex flex-wrap items-center gap-2">
                <FilterChip
                  active={activeFilters.size === 0}
                  onClick={clearFilters}
                  label="Tous"
                  count={playlists.length}
                />
                {groups.map((group) => (
                  <FilterChip
                    key={group.id}
                    active={activeFilters.has(group.id)}
                    onClick={() => toggleFilter(group.id)}
                    label={group.name}
                    count={countByGroup.get(group.id) || 0}
                  />
                ))}
                {ungroupedCount > 0 && (
                  <FilterChip
                    active={activeFilters.has(UNGROUPED_KEY)}
                    onClick={() => toggleFilter(UNGROUPED_KEY)}
                    label="Sans groupe"
                    count={ungroupedCount}
                  />
                )}
              </div>
            )}

            {filteredPlaylists.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-500">
                Aucune playlist dans cette sélection.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {filteredPlaylists.map((playlist) => (
                  <PlaylistCard
                    key={playlist.id}
                    playlist={playlist}
                    groupName={playlist.group_id ? groupNameById.get(playlist.group_id) : undefined}
                    onClick={() => (window.location.hash = `/playlists/${playlist.id}`)}
                    onPreview={() => setPreviewPlaylist(playlist)}
                    onEditSettings={canManage ? () => handleEditSettings(playlist) : undefined}
                    onDuplicate={canManage ? () => handleDuplicate(playlist) : undefined}
                    onDelete={canManage ? () => handleDelete(playlist) : undefined}
                  />
                ))}
                {canManage && <AddPlaylistCard onClick={handleCreate} />}
              </div>
            )}
          </div>
        )}
      </div>

      <PlaylistSettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        onSave={handleSaveSettings}
        initialSettings={
          editingPlaylist
            ? {
                name: editingPlaylist.name,
                orientation: editingPlaylist.orientation ?? 'landscape',
                group_id: editingPlaylist.group_id ?? null,
              }
            : undefined
        }
      />

      <CreateGroupDialog
        open={createGroupOpen}
        onOpenChange={setCreateGroupOpen}
        onCreated={handleGroupCreated}
      />

      <DeletePlaylistDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        playlistName={playlistToDelete?.name || ''}
        usedByScreens={screensUsingPlaylist}
        onConfirm={handleConfirmDelete}
      />

      {previewPlaylist && (
        <PlaylistPreviewModal
          open={!!previewPlaylist}
          playlistId={previewPlaylist.id}
          playlistName={previewPlaylist.name}
          orientation={previewPlaylist.orientation ?? 'landscape'}
          onClose={() => setPreviewPlaylist(null)}
        />
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 h-9 rounded-full px-4 text-sm font-medium transition-all ${
        active
          ? 'bg-slate-900 text-white shadow-sm'
          : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <span>{label}</span>
      <span
        className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold ${
          active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function EmptyState({ onCreate }: { onCreate?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <Folder className="h-6 w-6 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-1">
        Aucune playlist pour le moment
      </h3>
      <p className="text-sm text-slate-500 max-w-md mb-6">
        {onCreate
          ? 'Créez votre première playlist pour diffuser du contenu sur vos écrans.'
          : "Aucune playlist n'est disponible pour votre profil."}
      </p>
      {onCreate && (
        <Button onClick={onCreate} className="rounded-xl h-10 bg-slate-900 hover:bg-slate-800">
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle playlist
        </Button>
      )}
    </div>
  );
}
