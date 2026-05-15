import { useState, useRef } from 'react';
import { Upload, Globe, Palette, Plus, Trash2, Save, Loader as Loader2, CircleCheck as CheckCircle2, Image as ImageIcon, Pencil, Type } from 'lucide-react';
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
import { organizationService, type Organization, type BrandColor, type BrandFont } from '@/services/organization.service';
import { toast } from 'sonner';
import { allocateColorName } from '@/lib/brand-color-label';
import { normalizedHexUpper } from '@/lib/normalize-brand-hex';
import { BrandColorSuggestions } from './BrandColorSuggestions';
import { BrandFontSuggestions } from './BrandFontSuggestions';
import { ColorPicker } from './ColorPicker';
import { BrandFontPreviewBlock } from '@/components/company/BrandFontPreviewText';
import { AddEditBrandFontDialog } from '@/components/company/AddEditBrandFontDialog';
import { extractPrimaryFamilyFromStack } from '@/lib/extract-primary-font-family';

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
  const [fonts, setFonts] = useState<BrandFont[]>(
    Array.isArray(organization.brand_fonts) ? organization.brand_fonts : [],
  );

  const [editingColor, setEditingColor] = useState<BrandColor | null>(null);
  const [colorDialogOpen, setColorDialogOpen] = useState(false);
  const [editingFont, setEditingFont] = useState<BrandFont | null>(null);
  const [fontDialogOpen, setFontDialogOpen] = useState(false);

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

  const handleAddFontSuggestion = (payload: { name: string; family: string }) => {
    const k = payload.family.trim().toLowerCase();
    if (fonts.some((f) => f.family.trim().toLowerCase() === k)) {
      toast.message('Cette police figure déjà dans votre liste.', { duration: 3500 });
      return;
    }
    setFonts([
      ...fonts,
      {
        id: randomId(),
        name: payload.name.trim(),
        family: payload.family.trim(),
        font_file_url: null,
        custom_face_family: null,
      },
    ]);
    toast.success(`« ${payload.name.trim()} » ajoutée à vos polices`);
  };

  const openAddFont = () => {
    setEditingFont({
      id: randomId(),
      name: '',
      family: '',
      font_file_url: null,
      custom_face_family: null,
    });
    setFontDialogOpen(true);
  };

  const openEditFont = (f: BrandFont) => {
    setEditingFont({
      ...f,
      font_file_url: f.font_file_url ?? null,
      custom_face_family: f.custom_face_family ?? null,
    });
    setFontDialogOpen(true);
  };

  const persistFontFromDialog = (font: BrandFont) => {
    const exists = fonts.some((x) => x.id === font.id);
    if (exists) setFonts(fonts.map((x) => (x.id === font.id ? font : x)));
    else setFonts([...fonts, font]);
  };

  const handleDeleteFont = (id: string) => {
    setFonts(fonts.filter((f) => f.id !== id));
  };

  const handleAddSuggestion = (hex: string) => {
    const normalized = normalizedHexUpper(hex);
    if (!normalized) return;
    if (colors.some((c) => normalizedHexUpper(c.hex) === normalized)) {
      toast.message('Cette couleur figure déjà dans votre palette.', { duration: 3500 });
      return;
    }
    const occupied = new Set(colors.map((c) => c.name.trim().toLowerCase()).filter(Boolean));
    const name = allocateColorName(occupied, normalized);
    setColors([...colors, { id: randomId(), name, hex: normalized }]);
    toast.success(`« ${name} » ajoutée à vos couleurs principales`);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const updated = await organizationService.updateOrganization(organization.id, {
        logo_url: logoUrl,
        website: website.trim() || null,
        brand_colors: colors,
        brand_fonts: fonts,
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
            <h3 className="font-medium text-gray-900">Logo</h3>
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
            <h3 className="font-medium text-gray-900">Site web</h3>
            <p className="text-xs text-gray-500">L'adresse web officielle de votre entreprise</p>
          </div>
        </div>
        <div className="space-y-2">
          
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
              <h3 className="font-medium text-gray-900">Couleurs principales</h3>
              <p className="text-xs text-gray-500">Votre palette utilisée dans les contenus générés</p>
            </div>
          </div>
          <Button onClick={openAddColor} variant="outline" className="rounded-xl gap-2">
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        </div>

        <BrandColorSuggestions
          logoUrl={logoUrl}
          websiteUrl={website}
          savedColors={colors}
          onAddSuggestion={handleAddSuggestion}
        />

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

      {/* Brand fonts */}
      <section className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.02] sm:p-9">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <Type className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Polices d'écriture</h3>
              <p className="text-xs text-gray-500">Elles seront utilisées pour vos contenus</p>
            </div>
          </div>
          <Button onClick={openAddFont} variant="outline" className="rounded-xl gap-2">
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        </div>

        <BrandFontSuggestions
          logoUrl={logoUrl}
          websiteUrl={website}
          savedFonts={fonts}
          onAddSuggestion={handleAddFontSuggestion}
        />

        {fonts.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-10 text-center">
            <Type className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-600">Aucune police ajoutée</p>
            <p className="mt-1 text-xs text-gray-400">
              Analysez votre site ou importez depuis un logo SVG, puis affinez vos libellés (titres, corps de texte…).
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {fonts.map((f) => (
              <div
                key={f.id}
                className="group flex flex-col gap-2 rounded-xl border border-slate-200/75 bg-white p-3 shadow-sm ring-1 ring-slate-900/[0.02] transition-colors hover:border-slate-300/90"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-semibold leading-snug text-slate-900">{f.name}</p>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button size="icon" variant="ghost" onClick={() => openEditFont(f)} className="h-8 w-8 rounded-lg text-slate-600">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteFont(f.id)}
                      className="h-8 w-8 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <BrandFontPreviewBlock
                  cssFamily={f.family}
                  titleInFont={f.name}
                  webfontFamily={
                    f.font_file_url ? null : extractPrimaryFamilyFromStack(f.family)
                  }
                  fontFileUrl={f.font_file_url ?? undefined}
                  faceFamily={f.custom_face_family ?? undefined}
                />
                <p className="truncate font-mono text-[10px] leading-snug text-slate-500" title={f.family}>
                  {f.family}
                </p>
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

      {editingFont && (
        <AddEditBrandFontDialog
          open={fontDialogOpen}
          onOpenChange={(openDialog) => {
            setFontDialogOpen(openDialog);
            if (!openDialog) setEditingFont(null);
          }}
          organizationId={organization.id}
          dialogTitle={
            fonts.some((x) => x.id === editingFont.id) ? 'Modifier la police' : 'Ajouter une police'
          }
          draft={editingFont}
          onSave={persistFontFromDialog}
        />
      )}
    </div>
  );
}
