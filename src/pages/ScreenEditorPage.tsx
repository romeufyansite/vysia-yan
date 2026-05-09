import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Eye, MoveVertical as MoreVertical, Save, Loader as Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScreenCanvas } from '@/components/screen-editor/ScreenCanvas';
import { ScreenSettings } from '@/components/screen-editor/ScreenSettings';
import { screenService } from '@/services/screen.service';
import { playlistService } from '@/services/playlist.service';
import type { Screen, Playlist } from '@/types';
import { deriveScreenPlaylistId, normalizeZoneAssignments } from '@/lib/screen-zones';
import { toast } from 'sonner';
import { useMembership } from '@/contexts/MembershipContext';

interface ScreenEditorPageProps {
  screenId: string;
}

export function ScreenEditorPage({ screenId }: ScreenEditorPageProps) {
  const [screen, setScreen] = useState<Screen | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { can } = useMembership();
  const canManage = can('screens', 'manage');
  const denyManage = () => toast.error("Vous n'avez pas les droits pour gérer cet écran.");

  useEffect(() => {
    loadData();
  }, [screenId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [screenData, playlistsData] = await Promise.all([
        screenService.getById(screenId),
        playlistService.getAll(),
      ]);
      if (screenData) {
        setScreen(screenData);
      }
      setPlaylists(playlistsData);
    } catch (error) {
      console.error('Error loading screen:', error);
      toast.error('Erreur lors du chargement de l\'écran');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = (updates: Partial<Screen>) => {
    if (!screen) return;
    setScreen({ ...screen, ...updates });
  };

  const handleSave = async () => {
    if (!screen) return;

    try {
      setSaving(true);
      const payload = {
        ...screen,
        playlist_id: deriveScreenPlaylistId(screen),
      };
      await screenService.update(screenId, payload);
      toast.success('Écran mis à jour');
    } catch (error) {
      console.error('Error saving screen:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignPlaylistToZone = (zoneIndex: number, playlistId: string | null) => {
    if (!screen) return;

    const nextZones = normalizeZoneAssignments(screen.template, screen.zones, {
      zoneIndex,
      playlistId,
    });
    const nextPlaylistId = deriveScreenPlaylistId({
      template: screen.template,
      zones: nextZones,
      playlist_id: screen.playlist_id,
    });
    handleUpdate({ zones: nextZones, playlist_id: nextPlaylistId });
    toast.success(playlistId ? 'Playlist assignée à la zone' : 'Playlist retirée');
  };

  const handleOverlayMove = (overlayId: string, x: number, y: number) => {
    if (!screen) return;

    const overlays = (screen.overlays || []).map((overlay) =>
      overlay.id === overlayId ? { ...overlay, position: { x, y } } : overlay
    );

    handleUpdate({ overlays });
  };

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet écran ?')) return;

    try {
      await screenService.delete(screenId);
      toast.success('Écran supprimé');
      window.location.hash = '/screens';
    } catch (error) {
      console.error('Error deleting screen:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  if (loading || !screen) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" />
          <div className="text-sm">Chargement...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => (window.location.hash = '/screens')}
            className="rounded-xl flex-shrink-0"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold text-slate-900 truncate">
                {screen.name}
              </h1>
              <div
                className={`flex-shrink-0 w-2 h-2 rounded-full ${
                  screen.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              />
            </div>
            <p className="text-xs sm:text-sm text-slate-500">Paramètres écran</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            className="rounded-xl h-10 border-slate-200 hidden sm:inline-flex"
            onClick={() => toast.info('Aperçu à venir')}
          >
            <Eye className="h-4 w-4 mr-2" />
            Aperçu
          </Button>
          {canManage && (
            <>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl h-10 bg-slate-900 hover:bg-slate-800"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                <span className="hidden sm:inline">Enregistrer</span>
                <span className="sm:hidden">Save</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="rounded-xl h-10 w-10 border-slate-200">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  <DropdownMenuItem onClick={() => toast.info('Révocation à venir')}>
                    Révoquer appairage
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast.info('Duplication à venir')}>
                    Dupliquer
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600">
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
        <ScreenCanvas
          template={screen.template || 'fullscreen'}
          orientation={screen.orientation || 'landscape'}
          zones={screen.zones || []}
          overlays={screen.overlays || []}
          playlists={playlists}
          onAssignPlaylist={canManage ? handleAssignPlaylistToZone : undefined}
          onOverlayMove={canManage ? handleOverlayMove : () => denyManage()}
        />
        <ScreenSettings
          screen={screen}
          playlists={playlists}
          onUpdate={handleUpdate}
        />
      </div>
    </div>
  );
}
