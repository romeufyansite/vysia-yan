import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Monitor, Smartphone, LayoutGrid, LayoutPanelLeft, LayoutPanelTop, Clock, Image as ImageIcon, CloudSun, Megaphone, Settings2, ChevronDown, ChevronUp, QrCode, Timer, Type } from 'lucide-react';
import type { Screen, Playlist, ZoneTemplate, Overlay } from '@/types';
import { isKnownOverlayType } from '@/types';
import { OverlayConfigModal } from './OverlayConfigModal';
import {
  deriveScreenPlaylistId,
  getZoneDescriptors,
  normalizeZoneAssignments,
} from '@/lib/screen-zones';

interface ScreenSettingsProps {
  screen: Screen;
  playlists: Playlist[];
  onUpdate: (updates: Partial<Screen>) => void;
}

const TEMPLATES: {
  value: ZoneTemplate;
  label: string;
  Icon: typeof Monitor;
}[] = [
  { value: 'fullscreen', label: 'Plein écran', Icon: Monitor },
  { value: '70-30', label: '70/30', Icon: LayoutPanelLeft },
  { value: '30-70', label: '30/70', Icon: LayoutGrid },
  { value: 'banner', label: 'Bandeau', Icon: LayoutPanelTop },
];

function playlistIdMismatch(currentId: string, compatible: Playlist[]): boolean {
  if (!currentId) return false;
  return !compatible.some((p) => p.id === currentId);
}

const OVERLAY_TYPES: {
  type: Overlay['type'];
  label: string;
  description: string;
  Icon: typeof Clock;
  iconColor: string;
  iconBg: string;
  category: 'basic' | 'engagement' | 'information';
}[] = [
  {
    type: 'clock',
    label: 'Horloge',
    description: 'Heure et date modernes',
    Icon: Clock,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-50',
    category: 'basic',
  },
  {
    type: 'logo',
    label: 'Logo',
    description: 'Image personnalisée uploadée',
    Icon: ImageIcon,
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
    category: 'basic',
  },
  {
    type: 'weather',
    label: 'Météo',
    description: 'Météo en temps réel',
    Icon: CloudSun,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-50',
    category: 'information',
  },
  {
    type: 'announcement',
    label: 'Annonce',
    description: 'Message défilant personnalisable',
    Icon: Megaphone,
    iconColor: 'text-rose-600',
    iconBg: 'bg-rose-50',
    category: 'engagement',
  },
  {
    type: 'qrcode',
    label: 'QR Code',
    description: 'QR Code pour promotions',
    Icon: QrCode,
    iconColor: 'text-violet-600',
    iconBg: 'bg-violet-50',
    category: 'engagement',
  },
  {
    type: 'countdown',
    label: 'Compte à rebours',
    description: 'Timer pour événements',
    Icon: Timer,
    iconColor: 'text-orange-600',
    iconBg: 'bg-orange-50',
    category: 'engagement',
  },
  {
    type: 'ticker',
    label: 'Ticker',
    description: 'Défilement multiple messages',
    Icon: Type,
    iconColor: 'text-indigo-600',
    iconBg: 'bg-indigo-50',
    category: 'engagement',
  },
];

function getDefaultOverlayConfig(type: Overlay['type']): Overlay['config'] {
  switch (type) {
    case 'clock':
      return {
        style: 'modern',
        showDate: true,
        showSeconds: false,
        fontSize: 'medium',
        backgroundColor: 'rgba(15,23,42,0.78)',
        textColor: '#ffffff',
      };
    case 'weather':
      return {
        city: 'Paris',
        unit: 'celsius',
        style: 'modern',
        fontSize: 'medium',
        backgroundColor: 'rgba(15,23,42,0.78)',
        textColor: '#ffffff',
      };
    case 'announcement':
      return {
        text: 'Votre annonce ici',
        scrollBehavior: 'scroll',
        scrollDirection: 'left',
        scrollSpeed: 'normal',
        fontSize: 'medium',
        backgroundColor: 'rgba(244,63,94,0.92)',
        textColor: '#ffffff',
      };
    case 'logo':
      return {
        fontSize: 'medium',
        backgroundColor: 'transparent',
        logoBackgroundMode: 'transparent',
        textColor: '#0f172a',
      };
    case 'qrcode':
      return {
        qrContent: 'https://vysia.app',
        qrSize: 'medium',
        qrColor: '#000000',
        qrBgColor: '#ffffff',
        backgroundColor: 'rgba(255,255,255,0.95)',
      };
    case 'countdown':
      return {
        targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        countdownLabel: 'Événement dans',
        countdownStyle: 'boxes',
        showDays: true,
        showHours: true,
        showMinutes: true,
        showSeconds_countdown: true,
        backgroundColor: 'rgba(15,23,42,0.78)',
        textColor: '#ffffff',
      };
    case 'ticker':
      return {
        tickerItems: ['Information importante', 'Nouvelle offre disponible'],
        tickerSeparator: ' • ',
        scrollSpeed: 'normal',
        backgroundColor: 'rgba(15,23,42,0.85)',
        textColor: '#ffffff',
      };
  }
}

function getDefaultOverlayPosition(type: Overlay['type']): Overlay['position'] {
  switch (type) {
    case 'logo':
      return { x: 12, y: 12 };
    case 'clock':
      return { x: 16, y: 14 };
    case 'weather':
      return { x: 82, y: 14 };
    case 'announcement':
    case 'ticker':
      return { x: 50, y: 88 };
    case 'qrcode':
      return { x: 88, y: 72 };
    case 'countdown':
      return { x: 50, y: 14 };
  }
}

export function ScreenSettings({ screen, playlists, onUpdate }: ScreenSettingsProps) {
  const [configOverlay, setConfigOverlay] = useState<Overlay | null>(null);
  const [overlaysExpanded, setOverlaysExpanded] = useState(true);

  const handleTemplateChange = (template: ZoneTemplate) => {
    onUpdate({ template, zones: [], playlist_id: null });
  };

  const setZonePlaylist = (zoneIndex: number, playlistId: string | null) => {
    const nextZones = normalizeZoneAssignments(screen.template, screen.zones, {
      zoneIndex,
      playlistId,
    });
    const nextPlaylistId = deriveScreenPlaylistId({
      template: screen.template,
      zones: nextZones,
      playlist_id: screen.playlist_id,
    });
    onUpdate({ zones: nextZones, playlist_id: nextPlaylistId });
  };

  const handleOverlayToggle = (type: Overlay['type'], enabled: boolean) => {
    const overlays = [...(screen.overlays || [])];
    const existingIndex = overlays.findIndex((o) => o.type === type);

    if (existingIndex >= 0) {
      overlays[existingIndex] = { ...overlays[existingIndex], enabled };
    } else {
      overlays.push({
        id: `overlay-${Date.now()}`,
        type,
        enabled,
        position: getDefaultOverlayPosition(type),
        config: { ...getDefaultOverlayConfig(type), positionAnchor: 'center' },
      });
    }

    onUpdate({ overlays });
  };

  const handleOverlayConfig = (overlay: Overlay) => {
    const overlays = (screen.overlays || []).map((o) =>
      o.id === overlay.id ? overlay : o
    );
    onUpdate({ overlays });
    setConfigOverlay(null);
  };

  const activeOverlaysCount = (screen.overlays || []).filter(
    (o) => o.enabled && isKnownOverlayType(o.type)
  ).length;

  return (
    <aside className="w-full lg:w-[380px] xl:w-[420px] h-full bg-white border-l border-slate-200 overflow-y-auto flex-shrink-0">
      <div className="p-5 lg:p-6 space-y-6">
        <section className="space-y-2">
          <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Nom de l'écran
          </Label>
          <Input
            value={screen.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="h-11 rounded-xl border-slate-200 focus-visible:ring-slate-900"
            placeholder="Ex: Accueil lobby"
          />
        </section>

        <section className="space-y-3">
          <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Orientation
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onUpdate({ orientation: 'landscape' })}
              className={`group flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                screen.orientation === 'landscape' || !screen.orientation
                  ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Monitor className="h-6 w-6" />
              <span className="text-sm font-medium">Paysage</span>
            </button>
            <button
              type="button"
              onClick={() => onUpdate({ orientation: 'portrait' })}
              className={`group flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                screen.orientation === 'portrait'
                  ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Smartphone className="h-6 w-6" />
              <span className="text-sm font-medium">Portrait</span>
            </button>
          </div>
        </section>

        <section className="space-y-3">
          <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Disposition des zones
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES.map((template) => {
              const Icon = template.Icon;
              const selected = screen.template === template.value;
              return (
                <button
                  key={template.value}
                  type="button"
                  onClick={() => handleTemplateChange(template.value)}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                    selected
                      ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      selected ? 'bg-white/15' : 'bg-slate-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">{template.label}</span>
                </button>
              );
            })}
          </div>

          {(() => {
            const screenOrientation = screen.orientation || 'landscape';
            const compatible = playlists.filter(
              (p) => (p.orientation || 'landscape') === screenOrientation
            );
            const incompatible = playlists.filter(
              (p) => (p.orientation || 'landscape') !== screenOrientation
            );
            const descriptors = getZoneDescriptors(screen.template);
            const zonesArr = screen.zones || [];

            return (
              <div className="space-y-3 pt-2">
                <Label className="text-xs font-medium text-slate-600 normal-case tracking-normal">
                  Playlists par zone
                </Label>
                {descriptors.map((d, zoneIndex) => {
                  const currentId = zonesArr[zoneIndex]?.playlist_id ?? '';
                  const orphanMismatch = playlistIdMismatch(currentId, compatible);
                  const strayName = playlists.find((p) => p.id === currentId)?.name;
                  return (
                    <div key={d.key} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium text-slate-900">
                          {d.label}
                        </span>
                        <span className="text-xs text-slate-500 shrink-0">{d.share}</span>
                      </div>
                      <Select
                        value={currentId || '__none__'}
                        onValueChange={(value) =>
                          setZonePlaylist(zoneIndex, value === '__none__' ? null : value)
                        }
                      >
                        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                          <SelectValue placeholder="Sélectionner une playlist" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Aucune playlist</SelectItem>
                          {orphanMismatch && currentId && (
                            <SelectItem value={currentId}>
                              {strayName ?? 'Playlist (non trouvée)'} — orientation incompatible
                            </SelectItem>
                          )}
                          {compatible.map((playlist) => (
                            <SelectItem key={playlist.id} value={playlist.id}>
                              {playlist.name}
                            </SelectItem>
                          ))}
                          {compatible.length === 0 && !orphanMismatch && (
                            <div className="px-2 py-4 text-center text-sm text-slate-500">
                              Aucune playlist{' '}
                              {screenOrientation === 'portrait' ? 'portrait' : 'paysage'}{' '}
                              disponible
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      {orphanMismatch ? (
                        <p className="text-xs text-amber-700">
                          Cette playlist a une orientation différente de l&apos;écran — choisissez-en une compatible depuis la liste.
                        </p>
                      ) : null}
                    </div>
                  );
                })}
                {incompatible.length > 0 && (
                  <p className="text-xs text-slate-500">
                    {incompatible.length} playlist{incompatible.length > 1 ? 's sont' : ' est'}{' '}
                    masquée{incompatible.length > 1 ? 's' : ''} (orientation différente de l&apos;
                    écran).
                  </p>
                )}
              </div>
            );
          })()}
        </section>

        <section className="space-y-3">
          <button
            type="button"
            onClick={() => setOverlaysExpanded(!overlaysExpanded)}
            className="flex w-full items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide cursor-pointer">
                Overlays
              </Label>
              {activeOverlaysCount > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900 px-1.5 text-[10px] font-medium text-white">
                  {activeOverlaysCount}
                </span>
              )}
            </div>
            {overlaysExpanded ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>

          {overlaysExpanded && (
            <p className="text-xs text-slate-500 -mt-1">
              Sur l&apos;aperçu à gauche, faites glisser l&apos;overlay pour le positionner (clic maintenu sur le visuel) ; la position est sauvegardée en proportion de l&apos;écran.
            </p>
          )}

          {overlaysExpanded && (
            <div className="space-y-2">
              {OVERLAY_TYPES.map((overlayType) => {
                const overlay = (screen.overlays || []).find(
                  (o) => o.type === overlayType.type
                );
                const isEnabled = !!overlay?.enabled;
                const Icon = overlayType.Icon;
                return (
                  <div
                    key={overlayType.type}
                    className={`group rounded-xl border p-3 transition-all ${
                      isEnabled
                        ? 'border-slate-300 bg-white shadow-sm'
                        : 'border-slate-200 bg-slate-50/60 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${overlayType.iconBg}`}
                        >
                          <Icon className={`h-5 w-5 ${overlayType.iconColor}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-900 truncate">
                            {overlayType.label}
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            {overlayType.description}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-1">
                        {isEnabled && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-slate-900"
                            onClick={() => overlay && setConfigOverlay(overlay)}
                          >
                            <Settings2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(checked) =>
                            handleOverlayToggle(overlayType.type, checked)
                          }
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {configOverlay && (
        <OverlayConfigModal
          open={!!configOverlay}
          overlay={configOverlay}
          onClose={() => setConfigOverlay(null)}
          onSave={handleOverlayConfig}
        />
      )}
    </aside>
  );
}
