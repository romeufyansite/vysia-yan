import { useState } from 'react';
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
import { Clock, CloudSun, Megaphone, Image as ImageIcon } from 'lucide-react';
import type { Overlay } from '@/types';

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
    description: "Affiche l'heure du système en temps réel",
    Icon: Clock,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  weather: {
    title: 'Météo',
    description: 'Conditions et température pour une ville',
    Icon: CloudSun,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  announcement: {
    title: 'Annonce',
    description: 'Message texte à afficher sur l\'écran',
    Icon: Megaphone,
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-600',
  },
  logo: {
    title: 'Logo',
    description: 'Image personnalisée affichée sur l\'écran',
    Icon: ImageIcon,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
};

export function OverlayConfigModal({
  open,
  overlay,
  onClose,
  onSave,
}: OverlayConfigModalProps) {
  const [config, setConfig] = useState(overlay.config || {});
  const meta = OVERLAY_META[overlay.type];
  const Icon = meta.Icon;

  const handleSave = () => {
    onSave({ ...overlay, config });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] rounded-2xl">
        <DialogHeader>
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

        <div className="space-y-4 py-2">
          {overlay.type === 'weather' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="city" className="text-sm font-medium text-slate-700">
                  Ville
                </Label>
                <Input
                  id="city"
                  value={config.city || ''}
                  onChange={(e) => setConfig({ ...config, city: e.target.value })}
                  placeholder="Paris"
                  className="h-11 rounded-xl border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit" className="text-sm font-medium text-slate-700">
                  Unité
                </Label>
                <Select
                  value={config.unit || 'celsius'}
                  onValueChange={(value) =>
                    setConfig({ ...config, unit: value as 'celsius' | 'fahrenheit' })
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
            </>
          )}

          {overlay.type === 'announcement' && (
            <div className="space-y-2">
              <Label htmlFor="text" className="text-sm font-medium text-slate-700">
                Texte de l'annonce
              </Label>
              <Textarea
                id="text"
                value={config.text || ''}
                onChange={(e) => setConfig({ ...config, text: e.target.value })}
                placeholder="Entrez votre message..."
                className="rounded-xl border-slate-200 min-h-[120px]"
              />
              <p className="text-xs text-slate-500">
                Ce message sera affiché en superposition sur l'écran.
              </p>
            </div>
          )}

          {overlay.type === 'logo' && (
            <div className="space-y-2">
              <Label htmlFor="imageUrl" className="text-sm font-medium text-slate-700">
                URL de l'image
              </Label>
              <Input
                id="imageUrl"
                value={config.imageUrl || ''}
                onChange={(e) => setConfig({ ...config, imageUrl: e.target.value })}
                placeholder="https://example.com/logo.png"
                className="h-11 rounded-xl border-slate-200"
              />
              {config.imageUrl && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-center">
                  <img
                    src={config.imageUrl}
                    alt="Aperçu"
                    className="max-h-24 object-contain"
                  />
                </div>
              )}
            </div>
          )}

          {overlay.type === 'clock' && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-sm text-slate-600">
                L'horloge s'affichera automatiquement avec l'heure actuelle du système. Vous pouvez la déplacer sur l'écran en la glissant.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
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
