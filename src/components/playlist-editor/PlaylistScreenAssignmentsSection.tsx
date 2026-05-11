import { useCallback, useEffect, useState } from 'react';
import {
  ChevronRight,
  Monitor,
  Loader2,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Screen, ScreenOrientation } from '@/types';
import { playlistService } from '@/services/playlist.service';
import { screenService } from '@/services/screen.service';
import { ScreenPlaylistAssignmentModal } from '@/components/playlist-editor/ScreenPlaylistAssignmentModal';

interface PlaylistScreenAssignmentsSectionProps {
  playlistId: string;
  playlistName: string;
  playlistOrientation: ScreenOrientation;
  readOnly?: boolean;
}

export function PlaylistScreenAssignmentsSection({
  playlistId,
  playlistName,
  playlistOrientation,
  readOnly = false,
}: PlaylistScreenAssignmentsSectionProps) {
  const [assigned, setAssigned] = useState<{ id: string; name: string }[]>([]);
  const [loadingAssigned, setLoadingAssigned] = useState(true);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [allScreens, setAllScreens] = useState<Screen[]>([]);
  const [loadingPicker, setLoadingPicker] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedScreenId, setSelectedScreenId] = useState<string | null>(null);

  const loadAssigned = useCallback(async () => {
    try {
      setLoadingAssigned(true);
      const rows = await playlistService.getScreensUsingPlaylist(playlistId);
      setAssigned(rows);
    } catch {
      setAssigned([]);
    } finally {
      setLoadingAssigned(false);
    }
  }, [playlistId]);

  useEffect(() => {
    void loadAssigned();
  }, [loadAssigned]);

  const compatibleScreens = allScreens.filter(
    (s) => (s.orientation ?? 'landscape') === playlistOrientation
  );

  const openPicker = async () => {
    try {
      setLoadingPicker(true);
      setPickerOpen(true);
      const data = await screenService.getAll();
      setAllScreens(data);
    } catch {
      setAllScreens([]);
    } finally {
      setLoadingPicker(false);
    }
  };

  const openEditorFor = (screenId: string) => {
    setSelectedScreenId(screenId);
    setEditorOpen(true);
  };

  const handlePickScreen = (screenId: string) => {
    setPickerOpen(false);
    openEditorFor(screenId);
  };

  const assignedIds = new Set(assigned.map((x) => x.id));
  /** Écrans compatibles où la playlist peut encore être posée dans une zone (on ouvre l’éditeur visuel même si pas encore affectée). */
  const availableToAttach = compatibleScreens.filter((s) => !assignedIds.has(s.id));

  return (
    <>
      <section className="space-y-3 border-t border-slate-100 pt-6">
        <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Diffusion sur les écrans
        </Label>
        <p className="text-xs text-slate-500 font-light leading-relaxed mb-4">
          Visualisez les écrans qui utilisent «&nbsp;{playlistName}&nbsp;», ou ouvrez le gabarit des zones comme dans l&apos;éditeur d&apos;écran pour ajuster ou retirer l&apos;affectation.
        </p>

        {loadingAssigned ? (
          <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement…
          </div>
        ) : assigned.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-600">
            Cette playlist n&apos;est encore affectée sur aucun écran.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {assigned.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => !readOnly && openEditorFor(row.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left text-sm shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Monitor className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="truncate font-medium text-slate-900">{row.name}</span>
                  </span>
                  {!readOnly && <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />}
                </button>
              </li>
            ))}
          </ul>
        )}

        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            className="mt-1 h-11 w-full rounded-xl border-slate-200 border-dashed"
            onClick={() => void openPicker()}
          >
            <Plus className="mr-2 h-4 w-4" />
            Affecter à un écran
          </Button>
        )}
      </section>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="flex max-h-[min(560px,80vh)] flex-col gap-4 overflow-hidden rounded-2xl sm:max-w-md">
          <DialogHeader className="text-left">
            <DialogTitle className="text-lg">Choisir un écran</DialogTitle>
            <DialogDescription>
              Seuls les écrans en&nbsp;
              {playlistOrientation === 'portrait' ? 'portrait' : 'paysage'}
              {' '}sont affichés, pour correspondre à l&apos;orientation de la playlist.
            </DialogDescription>
          </DialogHeader>
          {loadingPicker ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
            </div>
          ) : compatibleScreens.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              Aucun écran compatible n&apos;est disponible. Créez un écran ou modifiez son orientation.
            </p>
          ) : (
            <div className="-mx-1 min-h-0 flex-1 space-y-1 overflow-y-auto px-1 pb-2">
              {compatibleScreens.map((s) => {
                const already = assignedIds.has(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handlePickScreen(s.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left text-sm transition-colors hover:bg-slate-50"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Monitor className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="truncate font-medium text-slate-900">{s.name}</span>
                    </span>
                    {already ? (
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                        Déjà associé
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs text-slate-400">Configurer</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {availableToAttach.length === 0 && compatibleScreens.length > 0 && !loadingPicker ? (
            <p className="text-xs text-slate-500">
              Tous vos écrans compatibles utilisent déjà cette playlist au moins une fois. Vous pouvez ouvrir l&apos;un d&apos;eux pour modifier les zones.
            </p>
          ) : null}
        </DialogContent>
      </Dialog>

      <ScreenPlaylistAssignmentModal
        open={editorOpen}
        onOpenChange={(o) => {
          setEditorOpen(o);
          if (!o) {
            setSelectedScreenId(null);
            void loadAssigned();
          }
        }}
        screenId={selectedScreenId}
        contextPlaylistName={playlistName}
        contextPlaylistOrientation={playlistOrientation}
        readOnly={readOnly}
        onSaved={() => void loadAssigned()}
      />
    </>
  );
}
