import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, Eye, Loader2, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { playlistService } from '@/services/playlist.service';
import { toast } from 'sonner';
import type { Playlist, PlaylistItem, ScreenOrientation } from '@/types';
import {
  AddPlaylistItemMethodDialog,
  type PlaylistAddMethod,
} from '@/components/playlist-editor/AddPlaylistItemMethodDialog';
import { AddPlaylistTimelineCard } from '@/components/playlist-editor/AddPlaylistTimelineCard';
import { PlaylistEmptyTimelinePreview } from '@/components/playlist-editor/PlaylistEmptyTimelinePreview';
import { SortablePlaylistItems } from '@/components/playlist-editor/SortablePlaylistItems';
import { AppsSidebar } from '@/components/playlist-editor/AppsSidebar';
import { PlaylistEditorMethodPanel } from '@/components/playlist-editor/PlaylistEditorMethodPanel';
import { PlaylistEditorSettingsSidebar } from '@/components/playlist-editor/PlaylistEditorSettingsSidebar';
import { ImageAppModal } from '@/components/playlist-editor/ImageAppModal';
import { PlaylistPreviewModal } from '@/components/playlists/PlaylistPreviewModal';
import { DeletePlaylistDialog } from '@/components/playlists/DeletePlaylistDialog';
import { useMembership } from '@/contexts/MembershipContext';

interface PlaylistEditorPageProps {
  playlistId: string;
}

type PlaylistEditorRightPanel = 'settings' | 'apps' | 'ai' | 'catalog';

export function PlaylistEditorPage({ playlistId }: PlaylistEditorPageProps) {
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageAppModalOpen, setImageAppModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PlaylistItem | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [addMethodDialogOpen, setAddMethodDialogOpen] = useState(false);
  const [rightPanel, setRightPanel] = useState<PlaylistEditorRightPanel>('settings');
  const [playlistNameDraft, setPlaylistNameDraft] = useState('');
  const [playlistOrientationDraft, setPlaylistOrientationDraft] = useState<ScreenOrientation>('landscape');
  const [playlistGroupDraft, setPlaylistGroupDraft] = useState<string | null>(null);
  const [savingPlaylistMeta, setSavingPlaylistMeta] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [screensUsingPlaylist, setScreensUsingPlaylist] = useState<string[]>([]);

  const { can } = useMembership();
  const canManage = can('playlists', 'manage');

  useEffect(() => {
    if (playlistId) {
      void loadPlaylist();
    }
  }, [playlistId]);

  useEffect(() => {
    setRightPanel('settings');
  }, [playlistId]);

  useEffect(() => {
    if (!playlist) return;
    setPlaylistNameDraft(playlist.name);
    setPlaylistOrientationDraft(playlist.orientation ?? 'landscape');
    setPlaylistGroupDraft(playlist.group_id ?? null);
  }, [playlist]);

  const loadPlaylist = async () => {
    try {
      setLoading(true);
      const data = await playlistService.getById(playlistId);
      setPlaylist(data);
      await reloadItemsOnly();
    } catch (error) {
      console.error('Error loading playlist:', error);
      toast.error('Erreur lors du chargement de la playlist');
    } finally {
      setLoading(false);
    }
  };

  const reloadItemsOnly = async () => {
    try {
      const itemsData = await playlistService.getItems(playlistId);
      setItems(itemsData);
    } catch (error) {
      console.error('Error loading playlist items:', error);
      toast.error('Erreur lors du chargement des cartes');
    }
  };

  const handleSavePlaylistMeta = async () => {
    if (!playlist || !canManage) return;

    try {
      setSavingPlaylistMeta(true);
      const updated = await playlistService.update(playlist.id, {
        name: playlistNameDraft.trim() || 'Playlist',
        orientation: playlistOrientationDraft,
        group_id: playlistGroupDraft,
      });
      setPlaylist(updated);
      toast.success('Playlist enregistrée');
      window.location.hash = '/playlists';
    } catch (error) {
      console.error('Error saving playlist:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSavingPlaylistMeta(false);
    }
  };

  const handleOpenDeletePlaylist = async () => {
    if (!playlist) return;
    try {
      const screens = await playlistService.getScreensUsingPlaylist(playlist.id);
      setScreensUsingPlaylist(screens.map((s) => s.name));
      setDeleteDialogOpen(true);
    } catch (error) {
      console.error('Error checking playlist usage:', error);
      toast.error('Erreur lors de la vérification');
    }
  };

  const handleConfirmDeletePlaylist = async () => {
    if (!playlist) return;
    try {
      await playlistService.delete(playlist.id);
      toast.success('Playlist supprimée');
      setDeleteDialogOpen(false);
      window.location.hash = '/playlists';
    } catch (error) {
      console.error('Error deleting playlist:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleAddImageApp = () => {
    setEditingItem(null);
    setImageAppModalOpen(true);
  };

  const handleEditItem = (item: PlaylistItem) => {
    setEditingItem(item);
    setImageAppModalOpen(true);
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await playlistService.deleteItem(itemId);
      toast.success('Élément supprimé');
      await reloadItemsOnly();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleSaveItem = async (data: PlaylistItem['config']) => {
    try {
      const durationSeconds =
        typeof data === 'object' &&
        data !== null &&
        'duration' in data &&
        typeof (data as { duration?: unknown }).duration === 'number'
          ? (data as { duration: number }).duration
          : 30;

      if (editingItem) {
        await playlistService.updateItem(editingItem.id, { config: data, duration: durationSeconds });
        toast.success('Élément mis à jour');
      } else {
        await playlistService.addItem(playlistId, {
          app_type: 'image',
          duration: durationSeconds,
          config: data,
          order_index: items.length,
        });
        toast.success('Élément ajouté');
      }
      setImageAppModalOpen(false);
      await reloadItemsOnly();
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleReorderItems = useCallback(async (nextItems: PlaylistItem[]) => {
    let previousSnapshot: PlaylistItem[] = [];
    setItems((prev) => {
      previousSnapshot = prev;
      return nextItems;
    });

    try {
      await playlistService.reorderItems(
        nextItems.map((item, index) => ({ id: item.id, order_index: index }))
      );
    } catch (error) {
      console.error('Error reordering items:', error);
      setItems(previousSnapshot);
      toast.error('Impossible de mettre à jour l’ordre des cartes.');
    }
  }, []);

  const handleOpenAddMethods = () => {
    setAddMethodDialogOpen(true);
  };

  const handleSelectAddMethod = (method: PlaylistAddMethod) => {
    setAddMethodDialogOpen(false);

    if (method === 'apps') {
      setRightPanel('apps');
      return;
    }
    if (method === 'ai') {
      setRightPanel('ai');
      return;
    }
    setRightPanel('catalog');
  };

  const handleBackToPlaylistSettings = () => {
    setRightPanel('settings');
  };

  const handleBack = () => {
    window.location.hash = '/playlists';
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" />
          <div className="text-sm">Chargement...</div>
        </div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-slate-600">Playlist introuvable</p>
          <Button onClick={handleBack} className="mt-4 rounded-xl">
            Retour aux playlists
          </Button>
        </div>
      </div>
    );
  }

  const headerTitle = playlistNameDraft.trim() || playlist.name || 'Playlist';
  const previewName = playlistNameDraft.trim() || playlist.name || 'Playlist';
  const previewOrientation = playlistOrientationDraft;

  const settingsSidebarShared = playlist ? (
    <PlaylistEditorSettingsSidebar
      playlist={playlist}
      name={playlistNameDraft}
      orientation={playlistOrientationDraft}
      groupId={playlistGroupDraft}
      onNameChange={setPlaylistNameDraft}
      onOrientationChange={setPlaylistOrientationDraft}
      onGroupIdChange={setPlaylistGroupDraft}
      readOnly={!canManage}
      controlsDisabled={savingPlaylistMeta}
    />
  ) : null;

  const rightSidebarEl =
    !canManage ? (
      settingsSidebarShared
    ) : rightPanel === 'settings' ? (
      settingsSidebarShared
    ) : rightPanel === 'apps' ? (
      <AppsSidebar onAddImageApp={handleAddImageApp} onClose={handleBackToPlaylistSettings} />
    ) : rightPanel === 'ai' ? (
      <PlaylistEditorMethodPanel
        title="Intelligence artificielle"
        description="Décrivez votre besoin et laissez l’IA composer pour vous. Ce parcours sera branché ici prochainement."
        onClose={handleBackToPlaylistSettings}
      />
    ) : (
      <PlaylistEditorMethodPanel
        title="Catalogue"
        description="Parcourez des modèles prêts à personnaliser. La bibliothèque éditoriale ouvrira dans ce panneau."
        onClose={handleBackToPlaylistSettings}
      />
    );

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="shrink-0 rounded-xl"
            aria-label="Retour aux playlists"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-slate-900 sm:text-lg">{headerTitle}</h1>
            <p className="text-xs text-slate-500 sm:text-sm">Paramètres playlist</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            type="button"
            className="hidden h-10 rounded-xl border-slate-200 sm:inline-flex"
            onClick={() => setPreviewOpen(true)}
          >
            <Eye className="mr-2 h-4 w-4" />
            Aperçu
          </Button>
          {canManage ? (
            <>
              <Button
                type="button"
                disabled={savingPlaylistMeta}
                onClick={() => void handleSavePlaylistMeta()}
                className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800"
              >
                {savingPlaylistMeta ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                <span className="hidden sm:inline">Enregistrer</span>
                <span className="sm:hidden">Enreg.</span>
              </Button>
              <Button
                variant="outline"
                type="button"
                size="icon"
                className="h-10 w-10 rounded-xl border-slate-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => void handleOpenDeletePlaylist()}
                aria-label="Supprimer la playlist"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          ) : null}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center pb-8 pt-4">
              <div className="space-y-8">
                {!canManage ? (
                  <div className="text-center">
                    <p className="text-base font-medium text-slate-800">Programme vide</p>
                    <p className="mt-2 mx-auto max-w-md text-sm leading-relaxed text-slate-500">
                      Aucun contenu n&apos;est prévu pour le moment sur cette playlist.
                    </p>
                  </div>
                ) : (
                  <PlaylistEmptyTimelinePreview>
                    {({ layout }) => (
                      <AddPlaylistTimelineCard
                        compact={layout === 'minimal'}
                        onClick={handleOpenAddMethods}
                      />
                    )}
                  </PlaylistEmptyTimelinePreview>
                )}
              </div>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-4xl">
              <div className="space-y-4">
                <SortablePlaylistItems
                  items={items}
                  draggable={canManage}
                  onEdit={canManage ? handleEditItem : undefined}
                  onDelete={canManage ? handleDeleteItem : undefined}
                  onReorder={handleReorderItems}
                />
                {canManage && (
                  <AddPlaylistTimelineCard compact onClick={handleOpenAddMethods} label="Ajouter du contenu" />
                )}
              </div>
            </div>
          )}
        </main>

          {rightSidebarEl}
        </div>

      <AddPlaylistItemMethodDialog
        open={addMethodDialogOpen}
        onOpenChange={setAddMethodDialogOpen}
        onSelectMethod={handleSelectAddMethod}
      />

      <ImageAppModal
        open={imageAppModalOpen}
        onOpenChange={setImageAppModalOpen}
        onSave={handleSaveItem}
        initialData={editingItem?.config}
      />

      <PlaylistPreviewModal
        open={previewOpen}
        playlistId={playlistId}
        playlistName={previewName}
        orientation={previewOrientation}
        onClose={() => setPreviewOpen(false)}
      />

      <DeletePlaylistDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        playlistName={previewName}
        usedByScreens={screensUsingPlaylist}
        onConfirm={() => void handleConfirmDeletePlaylist()}
      />
    </div>
  );
}
