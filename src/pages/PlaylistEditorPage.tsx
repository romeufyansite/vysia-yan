import { useState, useEffect } from 'react';
import { Eye, Monitor, MoveVertical as MoreVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { playlistService } from '@/services/playlist.service';
import { toast } from 'sonner';
import type { Playlist, PlaylistItem } from '@/types';
import { PlaylistItemCard } from '@/components/playlist-editor/PlaylistItemCard';
import { AppsSidebar } from '@/components/playlist-editor/AppsSidebar';
import { ImageAppModal } from '@/components/playlist-editor/ImageAppModal';
import { Sidebar } from '@/components/layout/Sidebar';
import { PlaylistPreviewModal } from '@/components/playlists/PlaylistPreviewModal';
import { useMembership } from '@/contexts/MembershipContext';

interface PlaylistEditorPageProps {
  playlistId: string;
}

export function PlaylistEditorPage({ playlistId }: PlaylistEditorPageProps) {
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageAppModalOpen, setImageAppModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PlaylistItem | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { can } = useMembership();
  const canManage = can('playlists', 'manage');

  useEffect(() => {
    loadPlaylists();
  }, []);

  useEffect(() => {
    if (playlistId) {
      loadPlaylist();
    }
  }, [playlistId]);

  const loadPlaylists = async () => {
    try {
      const data = await playlistService.getAll();
      setPlaylists(data);
    } catch (error) {
      console.error('Error loading playlists:', error);
      toast.error('Erreur lors du chargement des playlists');
    }
  };

  const loadPlaylist = async () => {
    try {
      setLoading(true);
      const data = await playlistService.getById(playlistId);
      setPlaylist(data);
      const itemsData = await playlistService.getItems(playlistId);
      setItems(itemsData);
    } catch (error) {
      console.error('Error loading playlist:', error);
      toast.error('Erreur lors du chargement de la playlist');
    } finally {
      setLoading(false);
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
      loadPlaylist();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleSaveItem = async (data: any) => {
    try {
      if (editingItem) {
        await playlistService.updateItem(editingItem.id, data);
        toast.success('Élément mis à jour');
      } else {
        await playlistService.addItem(playlistId, {
          app_type: 'image',
          duration: data.duration || 30,
          config: data,
          order_index: items.length,
        });
        toast.success('Élément ajouté');
      }
      setImageAppModalOpen(false);
      loadPlaylist();
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleBack = () => {
    window.location.hash = '/playlists';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Playlist introuvable</p>
          <Button onClick={handleBack} className="mt-4">
            Retour aux playlists
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="text-gray-600"
              >
                <X className="h-4 w-4 mr-2" />
                Fermer
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-lg font-medium text-gray-900">Playlists</h1>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                <Monitor className="h-4 w-4 mr-2" />
                Prévisualiser
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
                <Eye className="h-4 w-4 mr-2" />
                Aperçu
              </Button>
              {canManage && (
                <>
                  <Button variant="outline" size="sm">
                    <Monitor className="h-4 w-4 mr-2" />
                    Diffuser
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Dupliquer</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <Select
              value={playlist.id}
              onValueChange={(value) => {
                window.location.hash = `/playlists/${value}`;
              }}
            >
              <SelectTrigger className="w-64 h-10 bg-white border-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {playlists.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl">
            {items.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">
                  Aucun élément dans cette playlist
                </p>
                <p className="text-sm text-gray-400">
                  Utilisez les applications à droite pour ajouter du contenu
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <PlaylistItemCard
                    key={item.id}
                    item={item}
                    index={index}
                    onEdit={canManage ? () => handleEditItem(item) : undefined}
                    onDelete={canManage ? () => handleDeleteItem(item.id) : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {canManage && <AppsSidebar onAddImageApp={handleAddImageApp} />}

      <ImageAppModal
        open={imageAppModalOpen}
        onOpenChange={setImageAppModalOpen}
        onSave={handleSaveItem}
        initialData={editingItem?.config}
      />

      <PlaylistPreviewModal
        open={previewOpen}
        playlistId={playlistId}
        playlistName={playlist.name}
        orientation={playlist.orientation ?? 'landscape'}
        onClose={() => setPreviewOpen(false)}
      />
    </div>
  );
}
