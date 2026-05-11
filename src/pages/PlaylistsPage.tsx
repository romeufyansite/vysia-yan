import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Users } from 'lucide-react';
import { buildPlaylistToScreensMap } from '@/lib/playlist-screen-usage';
import { playlistService } from '@/services/playlist.service';
import { playlistGroupService } from '@/services/playlist-group.service';
import { screenService } from '@/services/screen.service';
import type { Playlist, PlaylistGroup } from '@/types';
import { toast } from 'sonner';
import { PlaylistSettingsDialog } from '@/components/playlists/PlaylistSettingsDialog';
import { DeletePlaylistDialog } from '@/components/playlists/DeletePlaylistDialog';
import { PlaylistCard } from '@/components/playlists/PlaylistCard';
import { AddPlaylistCard } from '@/components/playlists/AddPlaylistCard';
import { ManageGroupsDialog } from '@/components/playlists/ManageGroupsDialog';
import { PlaylistPreviewModal } from '@/components/playlists/PlaylistPreviewModal';
import {
  PlaylistsFiltersBar,
  type PlaylistsOrientationFilter,
  type PlaylistsStatusFilter,
} from '@/components/playlists/PlaylistsFiltersBar';
import { useMembership } from '@/contexts/MembershipContext';

const UNGROUPED_KEY = '__ungrouped__';

export function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [groups, setGroups] = useState<PlaylistGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [manageGroupsOpen, setManageGroupsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(null);
  const [screensUsingPlaylist, setScreensUsingPlaylist] = useState<string[]>([]);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [previewPlaylist, setPreviewPlaylist] = useState<Playlist | null>(null);
  const [playlistScreenUsage, setPlaylistScreenUsage] = useState<
    Record<string, { id: string; name: string }[]>
  >({});
  const [screensList, setScreensList] = useState<{ id: string; name: string }[]>([]);
  const [statusFilter, setStatusFilter] = useState<PlaylistsStatusFilter>('all');
  const [orientationFilter, setOrientationFilter] = useState<PlaylistsOrientationFilter>('all');
  const [selectedScreenIds, setSelectedScreenIds] = useState<Set<string>>(new Set());
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
      const [playlistsData, groupsData, usageRows] = await Promise.all([
        playlistService.getAll(),
        playlistGroupService.getAll(),
        screenService.getPlaylistUsageSnapshot(),
      ]);
      setPlaylists(playlistsData);
      setGroups(groupsData);
      setPlaylistScreenUsage(buildPlaylistToScreensMap(usageRows));

      const byScreenId = new Map<string, string>();
      for (const row of usageRows) {
        byScreenId.set(row.id, row.name);
      }
      setScreensList(
        [...byScreenId.entries()]
          .map(([id, name]) => ({ id, name }))
          .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
      );
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

  const handleGroupsUpdated = async () => {
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

  const filteredPlaylists = useMemo(() => {
    let next = playlists;
    if (activeFilters.size > 0) {
      next = next.filter((p) => activeFilters.has(p.group_id || UNGROUPED_KEY));
    }
    if (statusFilter === 'assigned') {
      next = next.filter((p) => (playlistScreenUsage[p.id]?.length ?? 0) > 0);
    } else if (statusFilter === 'unassigned') {
      next = next.filter((p) => (playlistScreenUsage[p.id]?.length ?? 0) === 0);
    }
    if (orientationFilter !== 'all') {
      next = next.filter((p) => (p.orientation ?? 'landscape') === orientationFilter);
    }
    if (selectedScreenIds.size > 0) {
      next = next.filter((p) => {
        const usedOn = playlistScreenUsage[p.id] ?? [];
        return usedOn.some((s) => selectedScreenIds.has(s.id));
      });
    }
    return next;
  }, [
    playlists,
    activeFilters,
    statusFilter,
    orientationFilter,
    selectedScreenIds,
    playlistScreenUsage,
  ]);

  const toggleFilter = (key: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const clearFilters = () => setActiveFilters(new Set());

  const toggleScreenFilter = useCallback((id: string) => {
    setSelectedScreenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearScreenSelection = useCallback(() => {
    setSelectedScreenIds(new Set());
  }, []);

  const resetAdvancedFiltersOnly = useCallback(() => {
    setStatusFilter('all');
    setOrientationFilter('all');
    setSelectedScreenIds(new Set());
  }, []);

  const resetAllFilters = useCallback(() => {
    setActiveFilters(new Set());
    setStatusFilter('all');
    setOrientationFilter('all');
    setSelectedScreenIds(new Set());
  }, []);

  const advancedFiltersActive =
    statusFilter !== 'all' || orientationFilter !== 'all' || selectedScreenIds.size > 0;

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
                onClick={() => setManageGroupsOpen(true)}
                className="rounded-xl h-10 border-slate-200"
              >
                <Users className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Catégories</span>
                <span className="sm:hidden">Catégories</span>
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
        ) : (
          <div className="space-y-6">
            <PlaylistsFiltersBar
              UNGROUPED_KEY={UNGROUPED_KEY}
              totalPlaylistCount={playlists.length}
              groups={groups}
              ungroupedCount={ungroupedCount}
              countByGroup={countByGroup}
              categoryActiveKeys={activeFilters}
              onCategoryToggle={toggleFilter}
              onCategoryClearAll={clearFilters}
              status={statusFilter}
              onStatusChange={setStatusFilter}
              orientation={orientationFilter}
              onOrientationChange={setOrientationFilter}
              screens={screensList}
              selectedScreenIds={selectedScreenIds}
              onToggleScreen={toggleScreenFilter}
              onClearScreenSelection={clearScreenSelection}
              onResetAdvanced={resetAdvancedFiltersOnly}
              showResetAdvanced={advancedFiltersActive}
              advancedFiltersActive={advancedFiltersActive}
            />

            {playlists.length > 0 ? (
              <>
                

                {filteredPlaylists.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-white px-6 py-16 text-center shadow-sm">
                    <p className="text-base font-medium text-slate-800">
                      Aucune playlist ne correspond à ces critères.
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      Modifiez ou réinitialisez vos filtres pour élargir le résultat.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-6 rounded-xl border-slate-200"
                      onClick={resetAllFilters}
                    >
                      Réinitialiser les filtres
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredPlaylists.map((playlist) => (
                      <PlaylistCard
                        key={playlist.id}
                        playlist={playlist}
                        groupName={
                          playlist.group_id ? groupNameById.get(playlist.group_id) : undefined
                        }
                        assignedScreens={playlistScreenUsage[playlist.id] ?? []}
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
              </>
            ) : (
              canManage && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
                  <AddPlaylistCard onClick={handleCreate} />
                </div>
              )
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

      <ManageGroupsDialog
        open={manageGroupsOpen}
        onOpenChange={setManageGroupsOpen}
        groups={groups}
        onGroupsUpdated={handleGroupsUpdated}
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