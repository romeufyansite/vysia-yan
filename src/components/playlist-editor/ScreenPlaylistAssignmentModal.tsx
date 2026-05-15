import { useCallback, useEffect, useMemo, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScreenCanvas } from '@/components/screen-editor/ScreenCanvas';
import { clampOverlayPercent } from '@/lib/overlay-position';
import { deriveScreenPlaylistId, normalizeZoneAssignments } from '@/lib/screen-zones';
import { playlistService } from '@/services/playlist.service';
import { screenService } from '@/services/screen.service';
import { isKnownOverlayType } from '@/types';
import type { Playlist, Screen, ScreenOrientation } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function stripScreenForDraft(data: Screen): Screen {
  const overlays = (data.overlays ?? []).filter((o) => isKnownOverlayType(o.type));
  return {
    ...data,
    playlist: undefined,
    screen_group: undefined,
    overlays,
  };
}

function screenSnapshot(s: Screen): string {
  return JSON.stringify({
    template: s.template ?? 'fullscreen',
    zones: s.zones ?? [],
    playlist_id: s.playlist_id,
    overlays: (s.overlays ?? []).filter((o) => isKnownOverlayType(o.type)),
  });
}

interface ScreenPlaylistAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  screenId: string | null;
  contextPlaylistName: string;
  contextPlaylistOrientation: ScreenOrientation;
  onSaved?: () => void;
  readOnly?: boolean;
}

export function ScreenPlaylistAssignmentModal({
  open,
  onOpenChange,
  screenId,
  contextPlaylistName,
  contextPlaylistOrientation,
  onSaved,
  readOnly = false,
}: ScreenPlaylistAssignmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Screen | null>(null);
  const [initialSnap, setInitialSnap] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  const loadPlaylistsList = useCallback(async () => {
    try {
      const data = await playlistService.getAll();
      setPlaylists(data);
    } catch {
      setPlaylists([]);
    }
  }, []);

  useEffect(() => {
    if (open) void loadPlaylistsList();
  }, [open, loadPlaylistsList]);

  useEffect(() => {
    if (!open || !screenId) {
      setDraft(null);
      setInitialSnap(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    screenService
      .getById(screenId)
      .then((data) => {
        if (cancelled || !data) return;
        const next = stripScreenForDraft({
          ...data,
          overlays: (data.overlays ?? []).filter((o) => isKnownOverlayType(o.type)),
        });
        setDraft(next);
        setInitialSnap(screenSnapshot(next));
      })
      .catch((e) => {
        console.error(e);
        toast.error('Impossible de charger l’écran');
        onOpenChange(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, screenId, onOpenChange]);

  const dirty = useMemo(() => {
    if (!draft || initialSnap === null) return false;
    return screenSnapshot(draft) !== initialSnap;
  }, [draft, initialSnap]);

  const screenOrientationMismatch =
    !!draft &&
    (draft.orientation ?? 'landscape') !==
      (contextPlaylistOrientation === 'portrait' ? 'portrait' : 'landscape');

  const handleAssignPlaylist = useCallback((zoneIndex: number, playlistId: string | null) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const template = prev.template ?? 'fullscreen';
      const nextZones = normalizeZoneAssignments(template, prev.zones, {
        zoneIndex,
        playlistId,
      });
      const nextPlaylistId = deriveScreenPlaylistId({
        template,
        zones: nextZones,
        playlist_id: prev.playlist_id,
      });
      return { ...prev, zones: nextZones, playlist_id: nextPlaylistId };
    });
  }, []);

  const handleOverlayPositionChange = useCallback((id: string, x: number, y: number) => {
    const nx = Math.round(clampOverlayPercent(x) * 10) / 10;
    const ny = Math.round(clampOverlayPercent(y) * 10) / 10;
    setDraft((prev) => {
      if (!prev) return prev;
      const overlays = (prev.overlays || []).map((o) =>
        o.id === id
          ? {
              ...o,
              position: { x: nx, y: ny },
              config: { ...o.config, positionAnchor: 'center' as const },
            }
          : o
      );
      return { ...prev, overlays };
    });
  }, []);

  const handleSave = async () => {
    if (!draft || !screenId || readOnly) return;
    try {
      setSaving(true);
      const payload = {
        template: draft.template ?? 'fullscreen',
        zones: draft.zones ?? [],
        playlist_id: deriveScreenPlaylistId(draft),
        overlays: (draft.overlays ?? []).filter((o) => isKnownOverlayType(o.type)),
      };
      const updated = await screenService.update(screenId, payload);
      const next = stripScreenForDraft(updated);
      setDraft(next);
      setInitialSnap(screenSnapshot(next));
      toast.success('Écran mis à jour');
      onSaved?.();
      setDraft(null);
      setInitialSnap(null);
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de l’enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenFullEditor = () => {
    if (screenId) window.location.hash = `/screens/${screenId}`;
  };

  const handleDialogOpenChange = (next: boolean) => {
    if (!next && dirty) {
      const ok = window.confirm(
        'Des modifications ne sont pas enregistrées. Fermer sans enregistrer ?'
      );
      if (!ok) return;
    }
    if (!next) {
      setDraft(null);
      setInitialSnap(null);
    }
    onOpenChange(next);
  };

  const template = draft?.template ?? 'fullscreen';
  const orientation = draft?.orientation ?? 'landscape';
  const zones = draft?.zones ?? [];

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-50 flex max-h-[90vh] w-[min(96vw,1180px)] max-w-[min(96vw,1180px)] translate-x-[-50%] translate-y-[-50%] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl duration-200',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
          )}
        >
          <div className="flex flex-col border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-lg font-medium text-slate-900 sm:text-xl">
                {loading ? 'Chargement…' : draft?.name ?? 'Écran'}
              </DialogTitle>
              <p className="text-sm text-slate-500">
                Affectez une playlist par zone, comme dans l’éditeur d’écran. Les overlays sont
                visibles ; enregistrez pour appliquer les changements.
              </p>
            </DialogHeader>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl border-slate-200"
                onClick={handleOpenFullEditor}
                disabled={!screenId}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Ouvrir l’éditeur d’écran
              </Button>
              {screenOrientationMismatch && (
                <span className="text-xs font-medium text-amber-700">
                  L&apos;orientation de cet écran ne correspond pas à la playlist&nbsp;: les playlists listées peuvent être filtrées.
                </span>
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
            {loading || !draft ? (
              <div className="flex flex-1 items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : (
              <ScreenCanvas
                template={template}
                orientation={orientation}
                zones={zones}
                playlists={playlists}
                overlays={draft.overlays}
                onOverlayPositionChange={
                  readOnly || saving ? undefined : handleOverlayPositionChange
                }
                onAssignPlaylist={readOnly || saving ? undefined : handleAssignPlaylist}
                onAddPlaylist={() => {
                  window.location.hash = '/playlists?create=true';
                }}
              />
            )}
          </div>

          <DialogFooter className="border-t border-slate-200 bg-white px-5 py-4 sm:px-6 sm:justify-between">
            <p className="hidden text-xs text-slate-500 sm:block">
              Depuis la playlist «&nbsp;{contextPlaylistName}&nbsp;» — enregistrez pour appliquer les
              affectations sur l&apos;écran.
              {dirty ? (
                <span className="ml-2 font-medium text-amber-600">Modifications non enregistrées.</span>
              ) : null}
            </p>
            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-slate-200"
                onClick={() => handleDialogOpenChange(false)}
              >
                Fermer
              </Button>
              {!readOnly && (
                <Button
                  type="button"
                  className="rounded-xl bg-slate-900 hover:bg-slate-800"
                  disabled={!dirty || saving || loading || !draft}
                  onClick={() => void handleSave()}
                >
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Enregistrer
                </Button>
              )}
            </div>
          </DialogFooter>

          <DialogPrimitive.Close className="absolute right-4 top-4 z-10 rounded-full border border-slate-200 bg-white p-2 text-slate-500 opacity-70 shadow-sm hover:bg-slate-50 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-400">
            <span className="sr-only">Fermer</span>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </Dialog>
  );
}
