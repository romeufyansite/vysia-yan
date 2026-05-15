import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Search, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { BrandFontPreviewBlock } from '@/components/company/BrandFontPreviewText';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cssFamilyStackFromName } from '@/lib/brand-font-label';
import { makeBrandFaceFamily } from '@/lib/custom-brand-font-face';
import { extractPrimaryFamilyFromStack } from '@/lib/extract-primary-font-family';
import { cn } from '@/lib/utils';
import type { BrandFont } from '@/services/organization.service';
import { organizationService } from '@/services/organization.service';
import {
  loadBunnyFontCatalog,
  searchFontCatalog,
  type CatalogFontRow,
} from '@/services/font-catalog.service';

interface AddEditBrandFontDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  dialogTitle: string;
  draft: BrandFont;
  onSave: (font: BrandFont) => void;
}

export function AddEditBrandFontDialog({
  open,
  onOpenChange,
  organizationId,
  dialogTitle,
  draft,
  onSave,
}: AddEditBrandFontDialogProps) {
  const [tab, setTab] = useState<'library' | 'upload'>('library');
  const [local, setLocal] = useState<BrandFont>(draft);
  const [catalog, setCatalog] = useState<CatalogFontRow[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedRow, setSelectedRow] = useState<CatalogFontRow | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setLocal(draft);
    setQuery('');
    const uploadMode = !!draft.font_file_url?.trim();
    setTab(uploadMode ? 'upload' : 'library');
    setSelectedRow(null);
    setCatalogError(null);
  }, [open, draft.id]);

  useEffect(() => {
    if (!open || catalog.length > 0) return;
    let cancelled = false;
    setCatalogLoading(true);
    void loadBunnyFontCatalog()
      .then((rows) => {
        if (!cancelled) setCatalog(rows);
      })
      .catch(() => {
        if (!cancelled) setCatalogError('Catalogue indisponible. Réessayez.');
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, catalog.length]);

  useEffect(() => {
    if (!open || !catalog.length || tab !== 'library') return;
    if (local.font_file_url?.trim()) return;
    const extracted = extractPrimaryFamilyFromStack(local.family);
    if (!extracted || !local.family.trim()) return;
    const row = catalog.find((c) => c.familyName.toLowerCase() === extracted.toLowerCase());
    if (row) setSelectedRow(row);
  }, [open, catalog, tab, local.family, local.font_file_url]);

  const filtered = useMemo(() => searchFontCatalog(catalog, query), [catalog, query]);

  const previewProps = useMemo(() => {
    if (tab === 'upload' && local.font_file_url && local.custom_face_family) {
      return {
        cssFamily: local.family,
        titleInFont: local.name.trim() || 'Aa',
        webfontFamily: null as string | null,
        fontFileUrl: local.font_file_url,
        faceFamily: local.custom_face_family,
      };
    }
    const famName = selectedRow?.familyName ?? extractPrimaryFamilyFromStack(local.family);
    const stack = famName ? cssFamilyStackFromName(famName) : '';
    return {
      cssFamily: stack || 'sans-serif',
      titleInFont: local.name.trim() || famName || 'Aa',
      webfontFamily: famName,
      fontFileUrl: null as string | null,
      faceFamily: null as string | null,
    };
  }, [tab, local, selectedRow]);

  const handlePickFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await organizationService.uploadBrandFontFile(organizationId, file);
      const face = makeBrandFaceFamily(local.id);
      setLocal((prev) => ({
        ...prev,
        font_file_url: url,
        custom_face_family: face,
        family: `'${face}', sans-serif`,
      }));
      toast.success('Fichier importé');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Import impossible');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleSubmit = () => {
    const name = local.name.trim();
    if (!name) {
      toast.error('Indiquez un nom d’usage (ex. Titres)');
      return;
    }
    if (tab === 'library') {
      if (!selectedRow) {
        toast.error('Choisissez une police dans la liste');
        return;
      }
      onSave({
        ...local,
        name,
        family: cssFamilyStackFromName(selectedRow.familyName),
        font_file_url: null,
        custom_face_family: null,
      });
      onOpenChange(false);
      return;
    }
    if (!local.font_file_url?.trim() || !local.custom_face_family?.trim()) {
      toast.error('Importez un fichier de police');
      return;
    }
    onSave({
      ...local,
      name,
    });
    onOpenChange(false);
  };

  const uploadBasename =
    local.font_file_url?.split(/[/\\]/).pop()?.split(/[#?]/)[0] ?? '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription className="sr-only">
            Choisissez une police dans le catalogue ou importez un fichier WOFF2, WOFF, TTF ou OTF.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label htmlFor="brand-font-name" className="text-sm font-medium text-gray-700">
              Nom d’usage
            </Label>
            <Input
              id="brand-font-name"
              value={local.name}
              onChange={(e) => setLocal((p) => ({ ...p, name: e.target.value }))}
              placeholder="Titres, corps de texte…"
              className="h-10 rounded-xl"
            />
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as 'library' | 'upload')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-xl bg-slate-100/90 p-1">
              <TabsTrigger value="library" className="rounded-lg text-sm">
                Bibliothèque
              </TabsTrigger>
              <TabsTrigger value="upload" className="rounded-lg text-sm">
                Importer
              </TabsTrigger>
            </TabsList>

            <TabsContent value="library" className="mt-3 space-y-3 outline-none">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher (ex. Inter, serif…) "
                  className="h-10 rounded-xl pl-9"
                  disabled={catalogLoading}
                />
              </div>
              {catalogLoading && (
                <div className="flex items-center gap-2 py-8 justify-center text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  Chargement du catalogue…
                </div>
              )}
              {catalogError && !catalogLoading && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  {catalogError}
                </p>
              )}
              {!catalogLoading && !catalogError && (
                <ScrollArea className="h-[220px] rounded-xl border border-slate-200/80 bg-slate-50/30">
                  <div className="p-1 pr-3">
                    {filtered.slice(0, 180).map((row) => {
                      const active =
                        selectedRow?.slug === row.slug ||
                        selectedRow?.familyName.toLowerCase() === row.familyName.toLowerCase();
                      return (
                        <button
                          key={row.slug}
                          type="button"
                          onClick={() => {
                            setSelectedRow(row);
                            setLocal((p) => ({ ...p, name: row.familyName }));
                          }}
                          className={cn(
                            'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                            active ? 'bg-white shadow-sm ring-1 ring-blue-500/25' : 'hover:bg-white/80',
                          )}
                        >
                          <span className="min-w-0 truncate font-medium text-slate-900">{row.familyName}</span>
                          <span className="shrink-0 text-[10px] uppercase tracking-wide text-slate-400">
                            {row.category}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
              {!catalogLoading && !catalogError && filtered.length === 0 && (
                <p className="py-6 text-center text-xs text-slate-500">Aucun résultat.</p>
              )}
            </TabsContent>

            <TabsContent value="upload" className="mt-3 space-y-3 outline-none">
              <input
                ref={fileRef}
                type="file"
                accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
                className="hidden"
                onChange={(e) => void handlePickFile(e.target.files?.[0])}
              />
              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                className="h-auto w-full flex-col gap-1 rounded-xl border-dashed py-6 text-center border-slate-200 bg-white hover:bg-slate-50"
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    <span className="text-xs text-slate-600">Envoi en cours…</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5 text-slate-500" />
                    <span className="text-sm font-medium text-slate-800">Choisir un fichier</span>
                    <span className="text-[11px] text-slate-500">WOFF2, WOFF, TTF ou OTF</span>
                  </>
                )}
              </Button>
              {uploadBasename ? (
                <p className="truncate text-center text-[11px] text-slate-500" title={local.font_file_url ?? ''}>
                  {uploadBasename}
                </p>
              ) : null}
            </TabsContent>
          </Tabs>

          <BrandFontPreviewBlock
            cssFamily={previewProps.cssFamily}
            titleInFont={previewProps.titleInFont}
            webfontFamily={previewProps.webfontFamily}
            fontFileUrl={previewProps.fontFileUrl}
            faceFamily={previewProps.faceFamily}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            Annuler
          </Button>
          <Button onClick={handleSubmit} className="rounded-xl bg-blue-600 hover:bg-blue-700">
            Valider
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
