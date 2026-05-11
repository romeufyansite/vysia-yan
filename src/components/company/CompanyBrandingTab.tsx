import { useState, useRef } from 'react';
import { Upload, Globe, Palette, Plus, Trash2, Save, Loader as Loader2, CircleCheck as CheckCircle2, Image as ImageIcon, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { organizationService, type Organization, type BrandColor } from '@/services/organization.service';
import { toast } from 'sonner';
import { ColorPicker } from './ColorPicker';

interface CompanyBrandingTabProps {
  organization: Organization;
  onUpdate: (org: Organization) => void;
}

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

export function CompanyBrandingTab({ organization, onUpdate }: CompanyBrandingTabProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [logoUrl, setLogoUrl] = useState<string | null>(organization.logo_url);
  const [website, setWebsite] = useState(organization.website || '');
  const [colors, setColors] = useState<BrandColor[]>(
    Array.isArray(organization.brand_colors) ? organization.brand_colors : [],
  );

  const [editingColor, setEditingColor] = useState<BrandColor | null>(null);
  const [colorDialogOpen, setColorDialogOpen] = useState(false);

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }
    setUploadingLogo(true);
    try {
      const url = await organizationService.uploadLogo(organization.id, file);
      setLogoUrl(url);
      toast.success('Logo téléchargé. Cliquez sur Enregistrer pour le sauvegarder.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du téléchargement');
    } finally {
      setUploadingLogo(false);
    }
  };

  const openAddColor = () => {
    setEditingColor({ id: randomId(), name: '', hex: '#2563EB' });
    setColorDialogOpen(true);
  };

  const openEditColor = (color: BrandColor) => {
    setEditingColor({ ...color });
    setColorDialogOpen(true);
  };

  const handleSaveColor = () => {
    if (!editingColor) return;
    if (!editingColor.name.trim()) {
      toast.error('Donnez un nom à cette couleur');
      return;
    }
    const exists = colors.some((c) => c.id === editingColor.id);
    if (exists) {
      setColors(colors.map((c) => (c.id === editingColor.id ? editingColor : c)));
    } else {
      setColors([...colors, editingColor]);
    }
    setColorDialogOpen(false);
    setEditingColor(null);
  };

  const handleDeleteColor = (id: string) => {
    setColors(colors.filter((c) => c.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const updated = await organizationService.updateOrganization(organization.id, {
        logo_url: logoUrl,
        website: website.trim() || null,
        brand_colors: colors,
      });
      onUpdate(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      toast.success('Image de marque mise à jour');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Logo */}
      <section className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.02] sm:p-9">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <ImageIcon className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Logo</h3>
            <p className="text-xs text-gray-500">Utilisé pour personnaliser vos contenus</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
            ) : (
              <ImageIcon className="h-10 w-10 text-gray-300" />
            )}
          </div>
          <div className="flex-1 space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoUpload(file);
              }}
            />
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingLogo}
                className="rounded-xl gap-2"
              >
                {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {logoUrl ? 'Changer le logo' : 'Téléverser un logo'}
              </Button>
              {logoUrl && (
                <Button
                  variant="ghost"
                  onClick={() => setLogoUrl(null)}
                  className="rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Retirer
                </Button>
              )}
            </div>
            <p className="text-xs text-gray-500">PNG ou SVG recommandé, fond transparent. 5 Mo max.</p>
          </div>
        </div>
      </section>

      {/* Website */}
      <section className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.02] sm:p-9">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Globe className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Site web</h3>
            <p className="text-xs text-gray-500">L'adresse officielle de votre entreprise</p>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">URL</Label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://www.votre-entreprise.com"
              className="pl-10"
            />
          </div>
        </div>
      </section>

      {/* Brand colors */}
      <section className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.02] sm:p-9">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Palette className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Couleurs principales</h3>
              <p className="text-xs text-gray-500">Votre palette utilisée dans les contenus générés</p>
            </div>
          </div>
          <Button onClick={openAddColor} variant="outline" className="rounded-xl gap-2">
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        </div>

        {colors.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-10 text-center">
            <Palette className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-600 font-medium">Aucune couleur ajoutée</p>
            <p className="text-xs text-gray-400 mt-1">Définissez votre charte graphique pour personnaliser vos contenus</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {colors.map((color) => (
              <div
                key={color.id}
                className="group relative flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 transition-colors hover:border-slate-300"
              >
                <div
                  className="w-12 h-12 rounded-lg border border-black/5 shadow-sm shrink-0"
                  style={{ backgroundColor: color.hex }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{color.name}</p>
                  <p className="text-xs text-gray-500 font-mono uppercase">{color.hex}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" onClick={() => openEditColor(color)} className="h-8 w-8 rounded-lg">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDeleteColor(color.id)} className="h-8 w-8 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Save button */}
      <div className="flex items-center justify-end gap-3 sticky bottom-4">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium gap-2 min-w-[160px] shadow-lg shadow-blue-600/20"
        >
          {saving ? (<><Loader2 className="h-4 w-4 animate-spin" />Sauvegarde...</>) :
            saved ? (<><CheckCircle2 className="h-4 w-4" />Sauvegardé</>) :
            (<><Save className="h-4 w-4" />Enregistrer</>)}
        </Button>
      </div>

      {/* Color dialog */}
      <Dialog open={colorDialogOpen} onOpenChange={setColorDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingColor && colors.some((c) => c.id === editingColor.id) ? 'Modifier la couleur' : 'Ajouter une couleur'}
            </DialogTitle>
          </DialogHeader>
          {editingColor && (
            <div className="space-y-5 py-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Nom</Label>
                <Input
                  value={editingColor.name}
                  onChange={(e) => setEditingColor({ ...editingColor, name: e.target.value })}
                  placeholder="Bleu principal"
                  className="h-11 rounded-xl"
                />
              </div>
              <ColorPicker
                hex={editingColor.hex}
                onChange={(hex) => setEditingColor({ ...editingColor, hex })}
              />
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setColorDialogOpen(false)} className="rounded-xl">
              Annuler
            </Button>
            <Button onClick={handleSaveColor} className="rounded-xl bg-blue-600 hover:bg-blue-700">
              Valider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
