import { useState, useCallback, useEffect, type CSSProperties } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, CloudSun, Megaphone, Image as ImageIcon, QrCode, Timer, Type, Upload, X, EyeOff, RefreshCw, Building2 } from 'lucide-react';
import type { Overlay } from '@/types';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { organizationService, type BrandColor } from '@/services/organization.service';

interface OverlayConfigModalProps {
  open: boolean;
  overlay: Overlay;
  onClose: () => void;
  onSave: (overlay: Overlay) => void;
}

const OVERLAY_META: Record<
  Overlay['type'],
  { title: string; description: string; Icon: typeof Clock; iconBg: string; iconColor: string }
> = {
  clock: {
    title: 'Horloge',
    description: 'Affiche l\'heure et la date avec un design moderne',
    Icon: Clock,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  weather: {
    title: 'Météo',
    description: 'Conditions météorologiques en temps réel',
    Icon: CloudSun,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  announcement: {
    title: 'Annonce',
    description: 'Messages défilants ou statiques personnalisables',
    Icon: Megaphone,
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-600',
  },
  logo: {
    title: 'Logo',
    description: 'Logo ou image personnalisée',
    Icon: ImageIcon,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  qrcode: {
    title: 'QR Code',
    description: 'QR Code scannable pour promotions ou informations',
    Icon: QrCode,
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
  },
  countdown: {
    title: 'Compte à rebours',
    description: 'Timer pour événements, promotions ou lancements',
    Icon: Timer,
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-600',
  },
  ticker: {
    title: 'Ticker d\'informations',
    description: 'Défilement de plusieurs messages ou actualités',
    Icon: Type,
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
  },
};

const PRESET_COLORS = [
  '#ffffff', '#000000', '#f8fafc', '#1e293b', '#ef4444', '#f97316', '#f59e0b',
  '#84cc16', '#22c55e', '#10b981', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
];

function normalizeHexForColorInput(hex: string | undefined): string {
  if (hex && /^#[0-9A-Fa-f]{6}$/i.test(hex)) return hex.toLowerCase();
  return '#ffffff';
}

function brandColorHex(hex: string): string {
  const t = hex.trim();
  if (!t) return '#000000';
  return t.startsWith('#') ? t : `#${t}`;
}

const LOGO_CHECKERBOARD_STYLE: CSSProperties = {
  background:
    'repeating-conic-gradient(rgb(226 232 240) 0% 25%, rgb(248 250 252) 0% 50%)',
  backgroundSize: '12px 12px',
};

export function OverlayConfigModal({
  open,
  overlay,
  onClose,
  onSave,
}: OverlayConfigModalProps) {
  const [config, setConfig] = useState(overlay.config || {});
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
  const [companyBrandColors, setCompanyBrandColors] = useState<BrandColor[]>([]);
  const meta = OVERLAY_META[overlay.type];
  const Icon = meta.Icon;

  useEffect(() => {
    setConfig(overlay.config || {});
    setPreviewUrl(overlay.config?.imageUrl ?? null);
  }, [overlay]);

  useEffect(() => {
    if (!open || overlay.type !== 'logo') {
      setCompanyLogoUrl(null);
      setCompanyBrandColors([]);
      return;
    }
    let cancelled = false;
    void organizationService
      .getCurrentOrganization()
      .then((org) => {
        if (!cancelled) {
          setCompanyLogoUrl(org?.logo_url && org.logo_url.trim() ? org.logo_url : null);
          const colors = org?.brand_colors;
          setCompanyBrandColors(Array.isArray(colors) ? (colors as BrandColor[]) : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCompanyLogoUrl(null);
          setCompanyBrandColors([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, overlay.type]);

  const handleSave = () => {
    let nextConfig = config;
    if (overlay.type === 'logo') {
      const mode = config.logoBackgroundMode ?? 'transparent';
      nextConfig = {
        ...config,
        logoBackgroundMode: mode,
        backgroundColor:
          mode === 'solid'
            ? config.backgroundColor && config.backgroundColor !== 'transparent'
              ? config.backgroundColor
              : '#ffffff'
            : 'transparent',
      };
    }
    onSave({ ...overlay, config: nextConfig });
  };

  const updateConfig = useCallback((updates: Partial<typeof config>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 5 Mo');
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.org_id) {
        throw new Error('Organisation introuvable');
      }

      const fileExt = file.name.split('.').pop();
      /** Le bucket `media` impose que le 1er segment = org_id (RLS). */
      const filePath = `${profile.org_id}/overlay-logos/${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      setConfig((prev) => ({
        ...prev,
        imageUrl: publicUrl,
        filePath,
      }));
      setPreviewUrl(publicUrl);
      toast.success('Image téléchargée avec succès');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erreur lors du téléchargement');
    } finally {
      setUploading(false);
    }
  };

  const clearImage = () => {
    setConfig((prev) => ({
      ...prev,
      imageUrl: '',
      filePath: '',
    }));
    setPreviewUrl(null);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px] rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${meta.iconBg}`}>
              <Icon className={`h-5 w-5 ${meta.iconColor}`} />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-slate-900">
                {meta.title}
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500">
                {meta.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* CLOCK CONFIGURATION */}
          {overlay.type === 'clock' && (
            <div className="space-y-5">
              <div className="space-y-3">
                <Label className="text-sm font-medium text-slate-700">Style de l'horloge</Label>
                <div className="grid grid-cols-3 gap-3">
                  {(['modern', 'classic', 'minimal'] as const).map((style) => (
                    <button
                      key={style}
                      onClick={() => updateConfig({ style })}
                      className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        config.style === style || (!config.style && style === 'modern')
                          ? 'border-slate-900 bg-slate-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {style === 'modern' && 'Moderne'}
                      {style === 'classic' && 'Classique'}
                      {style === 'minimal' && 'Minimal'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-slate-100">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium text-slate-700">Afficher les secondes</Label>
                  <p className="text-xs text-slate-500">Inclut les secondes dans l'affichage</p>
                </div>
                <Switch
                  checked={config.showSeconds || false}
                  onCheckedChange={(checked) => updateConfig({ showSeconds: checked })}
                />
              </div>

              <div className="flex items-center justify-between py-3 border-t border-slate-100">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium text-slate-700">Afficher la date</Label>
                  <p className="text-xs text-slate-500">Ajoute la date complète sous l'heure</p>
                </div>
                <Switch
                  checked={config.showDate !== false}
                  onCheckedChange={(checked) => updateConfig({ showDate: checked })}
                />
              </div>

              <div className="space-y-3 pt-2">
                <Label className="text-sm font-medium text-slate-700">Taille de l'affichage</Label>
                <div className="grid grid-cols-3 gap-3">
                  {(['small', 'medium', 'large'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => updateConfig({ fontSize: size })}
                      className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        config.fontSize === size || (!config.fontSize && size === 'medium')
                          ? 'border-slate-900 bg-slate-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {size === 'small' && 'Petit'}
                      {size === 'medium' && 'Moyen'}
                      {size === 'large' && 'Grand'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="rounded-xl bg-slate-900 p-6 text-center">
                <div className={`font-semibold tabular-nums text-white ${
                  config.fontSize === 'small' ? 'text-lg' :
                  config.fontSize === 'large' ? 'text-4xl' : 'text-3xl'
                }`}>
                  {new Date().toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: config.showSeconds ? '2-digit' : undefined,
                  })}
                </div>
                {(config.showDate !== false) && (
                  <div className="text-sm text-white/70 mt-2">
                    {new Date().toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* WEATHER CONFIGURATION */}
          {overlay.type === 'weather' && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="city" className="text-sm font-medium text-slate-700">
                  Ville
                </Label>
                <Input
                  id="city"
                  value={config.city || ''}
                  onChange={(e) => updateConfig({ city: e.target.value })}
                  placeholder="Paris, Lyon, Marseille..."
                  className="h-11 rounded-xl border-slate-200"
                />
                <p className="text-xs text-slate-500">
                  La météo sera affichée pour cette ville en temps réel
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit" className="text-sm font-medium text-slate-700">
                  Unité de température
                </Label>
                <Select
                  value={config.unit || 'celsius'}
                  onValueChange={(value) =>
                    updateConfig({ unit: value as 'celsius' | 'fahrenheit' })
                  }
                >
                  <SelectTrigger id="unit" className="h-11 rounded-xl border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="celsius">Celsius (°C)</SelectItem>
                    <SelectItem value="fahrenheit">Fahrenheit (°F)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 pt-2">
                <Label className="text-sm font-medium text-slate-700">Style d'affichage</Label>
                <div className="grid grid-cols-3 gap-3">
                  {(['modern', 'classic', 'minimal'] as const).map((style) => (
                    <button
                      key={style}
                      onClick={() => updateConfig({ style })}
                      className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        config.style === style || (!config.style && style === 'modern')
                          ? 'border-slate-900 bg-slate-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {style === 'modern' && 'Moderne'}
                      {style === 'classic' && 'Classique'}
                      {style === 'minimal' && 'Minimal'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 text-white">
                <div className="flex items-center gap-3">
                  <CloudSun className="h-8 w-8" />
                  <div>
                    <div className="text-2xl font-bold">24°{config.unit === 'fahrenheit' ? 'F' : 'C'}</div>
                    <div className="text-sm text-white/80">{config.city || 'Paris'} · Partiellement nuageux</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ANNOUNCEMENT CONFIGURATION */}
          {overlay.type === 'announcement' && (
            <div className="space-y-5">
              <Tabs defaultValue="content" className="w-full">
                <TabsList className="grid w-full grid-cols-2 rounded-xl">
                  <TabsTrigger value="content" className="rounded-lg">Contenu</TabsTrigger>
                  <TabsTrigger value="style" className="rounded-lg">Style</TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="text" className="text-sm font-medium text-slate-700">
                      Texte de l'annonce
                    </Label>
                    <Textarea
                      id="text"
                      value={config.text || ''}
                      onChange={(e) => updateConfig({ text: e.target.value })}
                      placeholder="Entrez votre message promotionnel, annonce ou information..."
                      className="rounded-xl border-slate-200 min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-slate-700">Comportement du texte</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['scroll', 'slide', 'static'] as const).map((behavior) => (
                        <button
                          key={behavior}
                          onClick={() => updateConfig({ scrollBehavior: behavior })}
                          className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                            (config.scrollBehavior === behavior) ||
                            (!config.scrollBehavior && behavior === 'scroll')
                              ? 'border-slate-900 bg-slate-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {behavior === 'scroll' && 'Défilant'}
                          {behavior === 'slide' && 'Slide'}
                          {behavior === 'static' && 'Statique'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {config.scrollBehavior !== 'static' && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-slate-700">Direction du défilement</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {(['left', 'right', 'up', 'down'] as const).map((dir) => (
                          <button
                            key={dir}
                            onClick={() => updateConfig({ scrollDirection: dir })}
                            className={`px-2 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                              config.scrollDirection === dir || (!config.scrollDirection && dir === 'left')
                                ? 'border-slate-900 bg-slate-50'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {dir === 'left' && '← Gauche'}
                            {dir === 'right' && 'Droite →'}
                            {dir === 'up' && '↑ Haut'}
                            {dir === 'down' && 'Bas ↓'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {config.scrollBehavior !== 'static' && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-slate-700">Vitesse</Label>
                      <div className="grid grid-cols-3 gap-3">
                        {(['slow', 'normal', 'fast'] as const).map((speed) => (
                          <button
                            key={speed}
                            onClick={() => updateConfig({ scrollSpeed: speed })}
                            className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                              config.scrollSpeed === speed || (!config.scrollSpeed && speed === 'normal')
                                ? 'border-slate-900 bg-slate-50'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {speed === 'slow' && 'Lente'}
                            {speed === 'normal' && 'Normale'}
                            {speed === 'fast' && 'Rapide'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="style" className="space-y-4 mt-4">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-slate-700">Taille du texte</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['small', 'medium', 'large'] as const).map((size) => (
                        <button
                          key={size}
                          onClick={() => updateConfig({ fontSize: size })}
                          className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                            config.fontSize === size || (!config.fontSize && size === 'medium')
                              ? 'border-slate-900 bg-slate-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {size === 'small' && 'Petit'}
                          {size === 'medium' && 'Moyen'}
                          {size === 'large' && 'Grand'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Couleur du texte</Label>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.slice(0, 10).map((color) => (
                        <button
                          key={color}
                          onClick={() => updateConfig({ textColor: color })}
                          className={`w-8 h-8 rounded-lg border-2 transition-all ${
                            config.textColor === color ? 'border-slate-900 scale-110' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Couleur de fond</Label>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.slice(0, 8).map((color) => (
                        <button
                          key={color}
                          onClick={() => updateConfig({ backgroundColor: color })}
                          className={`w-8 h-8 rounded-lg border-2 transition-all ${
                            config.backgroundColor === color ? 'border-slate-900 scale-110' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                      <button
                        onClick={() => updateConfig({ backgroundColor: 'transparent' })}
                        className={`w-8 h-8 rounded-lg border-2 transition-all bg-transparent ${
                          config.backgroundColor === 'transparent' ? 'border-slate-900' : 'border-slate-300'
                        }`}
                        title="Transparent"
                      >
                        <EyeOff className="w-4 h-4 mx-auto text-slate-400" />
                      </button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Preview */}
              <div className="rounded-xl bg-slate-900 p-4 overflow-hidden">
                <div
                  className={`text-white font-medium ${
                    config.fontSize === 'small' ? 'text-sm' :
                    config.fontSize === 'large' ? 'text-xl' : 'text-base'
                  }`}
                  style={{ color: config.textColor || '#ffffff' }}
                >
                  {config.text || 'Votre annonce apparaîtra ici'}
                </div>
              </div>
            </div>
          )}

          {/* LOGO CONFIGURATION */}
          {overlay.type === 'logo' && (
            <div className="space-y-5">
              {companyLogoUrl && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-slate-700">Logo de l&apos;entreprise</Label>
                  <button
                    type="button"
                    onClick={() => {
                      updateConfig({ imageUrl: companyLogoUrl });
                      setPreviewUrl(companyLogoUrl);
                    }}
                    className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                      config.imageUrl === companyLogoUrl
                        ? 'border-emerald-600 bg-emerald-50/60'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[repeating-conic-gradient(#e2e8f0_0%_25%,#f8fafc_0%_50%)] bg-[length:10px_10px] p-1">
                      <img src={companyLogoUrl} alt="" className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                        <Building2 className="h-4 w-4 shrink-0 text-slate-500" />
                        Utiliser le logo de l&apos;entreprise
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Défini dans Entreprise, onglet Image de marque. Vous pouvez activer un fond coloré
                        ci-dessous si besoin.
                      </p>
                    </div>
                  </button>
                </div>
              )}

              <div className="space-y-3">
                <Label className="text-sm font-medium text-slate-700">
                  {companyLogoUrl ? 'Logo personnalisé (fichier)' : 'Télécharger un logo'}
                </Label>

                {previewUrl ? (
                  <div
                    className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-6"
                    style={
                      (config.logoBackgroundMode ?? 'transparent') === 'solid'
                        ? {
                            backgroundColor: normalizeHexForColorInput(config.backgroundColor),
                          }
                        : LOGO_CHECKERBOARD_STYLE
                    }
                  >
                    <img
                      src={previewUrl}
                      alt="Logo preview"
                      className="mb-4 max-h-32 max-w-full object-contain"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearImage}
                        className="rounded-lg"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Supprimer
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="relative cursor-pointer rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 transition-colors hover:border-slate-400"
                    onClick={() => document.getElementById('logo-upload')?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      if (file) handleFileUpload(file);
                    }}
                  >
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                    />
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                        {uploading ? (
                          <RefreshCw className="h-5 w-5 animate-spin text-slate-500" />
                        ) : (
                          <Upload className="h-5 w-5 text-slate-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          {uploading ? 'Téléchargement...' : 'Cliquez ou glissez une image'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">PNG, JPG, SVG jusqu&apos;à 5 Mo</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <Label className="text-sm font-medium text-slate-700">Fond derrière le logo</Label>
                <p className="text-xs text-slate-500">
                  Transparent : seule l&apos;image est visible sur l&apos;écran. Couleur : zone arrondie derrière le
                  logo.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateConfig({
                        logoBackgroundMode: 'transparent',
                        backgroundColor: 'transparent',
                      })
                    }
                    className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all ${
                      (config.logoBackgroundMode ?? 'transparent') === 'transparent'
                        ? 'border-slate-900 bg-white'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    Transparent
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateConfig({
                        logoBackgroundMode: 'solid',
                        backgroundColor:
                          config.backgroundColor && config.backgroundColor !== 'transparent'
                            ? config.backgroundColor
                            : '#ffffff',
                      })
                    }
                    className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all ${
                      (config.logoBackgroundMode ?? 'transparent') === 'solid'
                        ? 'border-slate-900 bg-white'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    Couleur
                  </button>
                </div>

                {(config.logoBackgroundMode ?? 'transparent') === 'solid' && (
                  <div className="space-y-4 border-t border-slate-200/80 pt-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Palette prédéfinie
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {PRESET_COLORS.map((color) => {
                          const selected =
                            normalizeHexForColorInput(config.backgroundColor) ===
                            normalizeHexForColorInput(color);
                          return (
                            <button
                              key={color}
                              type="button"
                              title={color}
                              onClick={() =>
                                updateConfig({
                                  logoBackgroundMode: 'solid',
                                  backgroundColor: color,
                                })
                              }
                              className={`h-8 w-8 rounded-lg border-2 transition-all ${
                                selected ? 'scale-110 border-slate-900' : 'border-transparent hover:scale-105'
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {companyBrandColors.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Couleurs de marque (entreprise)
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {companyBrandColors.map((c, idx) => {
                            const hex = brandColorHex(c.hex || '#000000');
                            const selected =
                              normalizeHexForColorInput(config.backgroundColor) ===
                              normalizeHexForColorInput(hex);
                            return (
                              <button
                                key={c.id || `brand-${idx}`}
                                type="button"
                                title={c.name ? `${c.name} (${hex})` : hex}
                                aria-label={c.name || hex}
                                onClick={() =>
                                  updateConfig({
                                    logoBackgroundMode: 'solid',
                                    backgroundColor: hex,
                                  })
                                }
                                className={`h-8 w-8 shrink-0 rounded-lg border-2 transition-all ${
                                  selected ? 'scale-110 border-slate-900' : 'border-transparent hover:scale-105'
                                }`}
                                style={{ backgroundColor: hex }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3">
                      <Label className="text-xs font-medium text-slate-600">Couleur personnalisée</Label>
                      <input
                        type="color"
                        value={normalizeHexForColorInput(config.backgroundColor)}
                        onChange={(e) =>
                          updateConfig({
                            logoBackgroundMode: 'solid',
                            backgroundColor: e.target.value,
                          })
                        }
                        className="h-9 w-14 cursor-pointer rounded border border-slate-200 bg-white p-0"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-2">
                <Label className="text-sm font-medium text-slate-700">Taille du logo</Label>
                <div className="grid grid-cols-3 gap-3">
                  {(['small', 'medium', 'large'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => updateConfig({ fontSize: size })}
                      className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        config.fontSize === size || (!config.fontSize && size === 'medium')
                          ? 'border-slate-900 bg-slate-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {size === 'small' && 'Petit (40px)'}
                      {size === 'medium' && 'Moyen (60px)'}
                      {size === 'large' && 'Grand (80px)'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* QR CODE CONFIGURATION */}
          {overlay.type === 'qrcode' && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="qrContent" className="text-sm font-medium text-slate-700">
                  Contenu du QR Code
                </Label>
                <Textarea
                  id="qrContent"
                  value={config.qrContent || ''}
                  onChange={(e) => updateConfig({ qrContent: e.target.value })}
                  placeholder="https://votre-site.com, email@exemple.com, ou texte..."
                  className="rounded-xl border-slate-200 min-h-[80px]"
                />
                <p className="text-xs text-slate-500">
                  URL, email (mailto:), téléphone (tel:), ou tout texte
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium text-slate-700">Taille du QR Code</Label>
                <div className="grid grid-cols-3 gap-3">
                  {(['small', 'medium', 'large'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => updateConfig({ qrSize: size })}
                      className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        config.qrSize === size || (!config.qrSize && size === 'medium')
                          ? 'border-slate-900 bg-slate-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {size === 'small' && 'Petit (100px)'}
                      {size === 'medium' && 'Moyen (150px)'}
                      {size === 'large' && 'Grand (200px)'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Couleur</Label>
                <div className="flex flex-wrap gap-2">
                  {['#000000', '#1e293b', '#dc2626', '#2563eb', '#16a34a', '#9333ea', '#ea580c'].map((color) => (
                    <button
                      key={color}
                      onClick={() => updateConfig({ qrColor: color })}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${
                        (config.qrColor === color) || (!config.qrColor && color === '#000000')
                          ? 'border-slate-900 scale-110'
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Preview placeholder */}
              <div className="rounded-xl bg-slate-900 p-6 flex items-center justify-center">
                <div className="text-center">
                  <QrCode className="h-16 w-16 text-white/30 mx-auto mb-2" />
                  <p className="text-sm text-white/50">
                    {config.qrContent ? 'QR Code sera généré' : 'Entrez du contenu pour générer le QR Code'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* COUNTDOWN CONFIGURATION */}
          {overlay.type === 'countdown' && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="targetDate" className="text-sm font-medium text-slate-700">
                  Date et heure cible
                </Label>
                <Input
                  id="targetDate"
                  type="datetime-local"
                  value={config.targetDate || ''}
                  onChange={(e) => updateConfig({ targetDate: e.target.value })}
                  className="h-11 rounded-xl border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="countdownLabel" className="text-sm font-medium text-slate-700">
                  Libellé (optionnel)
                </Label>
                <Input
                  id="countdownLabel"
                  value={config.countdownLabel || ''}
                  onChange={(e) => updateConfig({ countdownLabel: e.target.value })}
                  placeholder="Ex: Ouverture dans, Promo se termine dans..."
                  className="h-11 rounded-xl border-slate-200"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium text-slate-700">Éléments à afficher</Label>
                <div className="space-y-2">
                  {[
                    { key: 'showDays', label: 'Jours' },
                    { key: 'showHours', label: 'Heures' },
                    { key: 'showMinutes', label: 'Minutes' },
                    { key: 'showSeconds_countdown', label: 'Secondes' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm text-slate-700">{label}</span>
                      <Switch
                        checked={config[key as keyof typeof config] !== false}
                        onCheckedChange={(checked) =>
                          updateConfig({ [key]: checked })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium text-slate-700">Style du compte à rebours</Label>
                <div className="grid grid-cols-3 gap-3">
                  {(['compact', 'expanded', 'boxes'] as const).map((style) => (
                    <button
                      key={style}
                      onClick={() => updateConfig({ countdownStyle: style })}
                      className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        config.countdownStyle === style || (!config.countdownStyle && style === 'expanded')
                          ? 'border-slate-900 bg-slate-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {style === 'compact' && 'Compact'}
                      {style === 'expanded' && 'Étendu'}
                      {style === 'boxes' && 'Boîtes'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="rounded-xl bg-slate-900 p-4 text-center text-white">
                {config.countdownLabel && (
                  <p className="text-sm text-white/70 mb-2">{config.countdownLabel}</p>
                )}
                <div className="flex items-center justify-center gap-3">
                  {(!config.countdownStyle || config.countdownStyle === 'expanded' || config.countdownStyle === 'boxes') ? (
                    <>
                      <div className={`${config.countdownStyle === 'boxes' ? 'bg-white/10 rounded-lg px-3 py-2' : ''}`}>
                        <div className="text-2xl font-bold">02</div>
                        <div className="text-xs text-white/60">jours</div>
                      </div>
                      <div className={`${config.countdownStyle === 'boxes' ? 'bg-white/10 rounded-lg px-3 py-2' : ''}`}>
                        <div className="text-2xl font-bold">14</div>
                        <div className="text-xs text-white/60">heures</div>
                      </div>
                      <div className={`${config.countdownStyle === 'boxes' ? 'bg-white/10 rounded-lg px-3 py-2' : ''}`}>
                        <div className="text-2xl font-bold">35</div>
                        <div className="text-xs text-white/60">min</div>
                      </div>
                    </>
                  ) : (
                    <div className="text-2xl font-bold">02:14:35</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TICKER CONFIGURATION */}
          {overlay.type === 'ticker' && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="tickerText" className="text-sm font-medium text-slate-700">
                  Messages (un par ligne)
                </Label>
                <Textarea
                  id="tickerText"
                  value={(config.tickerItems || []).join('\n')}
                  onChange={(e) =>
                    updateConfig({
                      tickerItems: e.target.value.split('\n').filter((item) => item.trim()),
                    })
                  }
                  placeholder="Nouvelle collection disponible&#10;Livraison gratuite ce week-end&#10;Promo -20% sur tous les articles"
                  className="rounded-xl border-slate-200 min-h-[120px]"
                />
                <p className="text-xs text-slate-500">
                  Chaque ligne devient un message dans le ticker
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="separator" className="text-sm font-medium text-slate-700">
                  Séparateur
                </Label>
                <Input
                  id="separator"
                  value={config.tickerSeparator || ' • '}
                  onChange={(e) => updateConfig({ tickerSeparator: e.target.value })}
                  placeholder=" • "
                  className="h-11 rounded-xl border-slate-200"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium text-slate-700">Vitesse</Label>
                <div className="grid grid-cols-3 gap-3">
                  {(['slow', 'normal', 'fast'] as const).map((speed) => (
                    <button
                      key={speed}
                      onClick={() => updateConfig({ scrollSpeed: speed })}
                      className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        config.scrollSpeed === speed || (!config.scrollSpeed && speed === 'normal')
                          ? 'border-slate-900 bg-slate-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {speed === 'slow' && 'Lente'}
                      {speed === 'normal' && 'Normale'}
                      {speed === 'fast' && 'Rapide'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="rounded-xl bg-slate-900 p-3 overflow-hidden">
                <div className="text-white text-sm whitespace-nowrap animate-pulse">
                  {(config.tickerItems || ['Message 1', 'Message 2', 'Message 3']).join(config.tickerSeparator || ' • ')}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border-slate-200"
          >
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 h-11 rounded-xl bg-slate-900 hover:bg-slate-800"
          >
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
