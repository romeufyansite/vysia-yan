import { useCallback, useEffect, useMemo, useState } from 'react';
import { Globe, Loader2, Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { allocateFontDisplayName, cssFamilyStackFromName } from '@/lib/brand-font-label';
import { extractFontFamiliesFromLogoUrl } from '@/lib/extract-fonts-from-logo';
import type { BrandFont } from '@/services/organization.service';
import { fetchWebsiteFontSuggestions, type WebsiteFontSuggestion } from '@/services/brand-fonts.service';
import { BrandFontPreviewBlock } from '@/components/company/BrandFontPreviewText';
import { extractPrimaryFamilyFromStack } from '@/lib/extract-primary-font-family';

function coercePublicHttpUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    if (!/^https?:\/\//i.test(t)) {
      return new URL(`https://${t}`).href;
    }
    const u = new URL(t);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.href;
  } catch {
    return null;
  }
}

function familyDedupKey(cssFamily: string): string {
  return cssFamily.trim().toLowerCase();
}

export interface BrandFontSuggestionsProps {
  logoUrl: string | null;
  websiteUrl: string;
  savedFonts: BrandFont[];
  onAddSuggestion: (payload: { name: string; family: string }) => void;
}

/** Jusque 2 pistes automatiques depuis le SVG ; jusqu’à 3 rôles différents côté site (servi par l’API). */
export function BrandFontSuggestions({
  logoUrl,
  websiteUrl,
  savedFonts,
  onAddSuggestion,
}: BrandFontSuggestionsProps) {
  const [logoFamilies, setLogoFamilies] = useState<string[]>([]);
  const [siteRows, setSiteRows] = useState<WebsiteFontSuggestion[]>([]);
  const [logoLoading, setLogoLoading] = useState(false);
  const [siteLoading, setSiteLoading] = useState(false);

  const savedKeys = useMemo(() => new Set(savedFonts.map((f) => familyDedupKey(f.family))), [savedFonts]);

  useEffect(() => {
    let cancelled = false;
    async function run(url: string) {
      setLogoLoading(true);
      try {
        const list = await extractFontFamiliesFromLogoUrl(url);
        if (!cancelled) setLogoFamilies(list);
      } finally {
        if (!cancelled) setLogoLoading(false);
      }
    }
    if (!logoUrl?.trim()) {
      setLogoFamilies([]);
      setLogoLoading(false);
      return;
    }
    const h = window.setTimeout(() => {
      void run(logoUrl);
    }, 500);
    return () => {
      cancelled = true;
      window.clearTimeout(h);
    };
  }, [logoUrl]);

  const analyzeWebsite = useCallback(async () => {
    const resolved = coercePublicHttpUrl(websiteUrl);
    if (!resolved) {
      toast.error('Saisissez une URL web valide (ex. exemple.com)');
      setSiteRows([]);
      return;
    }
    setSiteLoading(true);
    try {
      const list = await fetchWebsiteFontSuggestions(resolved);
      setSiteRows(list);
      if (!list.length) {
        toast.message('Aucune police titres/sous-titres/texte mise en évidence. Ajoutez-les à la main ou vérifiez le CSS.', {
          duration: 4800,
        });
      }
    } catch (e) {
      console.error('[BrandFontSuggestions]', e);
      setSiteRows([]);
      toast.error(e instanceof Error ? e.message : 'Analyse du site impossible');
    } finally {
      setSiteLoading(false);
    }
  }, [websiteUrl]);

  const mergedLogo = useMemo(() => {
    return logoFamilies.map((label) => ({
      label: label.trim(),
      css: cssFamilyStackFromName(label),
      role: 'Logo (SVG)',
    })).filter((row) => row.label && !savedKeys.has(familyDedupKey(row.css)));
  }, [logoFamilies, savedKeys]);

  const mergedSite = useMemo(() => {
    return siteRows
      .map((row) => ({
        label: row.family.trim(),
        css: cssFamilyStackFromName(row.family),
        role: row.role,
      }))
      .filter((row) => row.label && !savedKeys.has(familyDedupKey(row.css)));
  }, [siteRows, savedKeys]);

  const showBody = !!(logoUrl?.trim() || coercePublicHttpUrl(websiteUrl));

  function handleAddChip(labelForName: string, css: string): void {
    const occupiedNames = new Set(savedFonts.map((f) => f.name.trim().toLowerCase()));
    const name = allocateFontDisplayName(occupiedNames, labelForName.trim() || css);
    if (savedKeys.has(familyDedupKey(css))) {
      toast.message('Cette police est déjà dans votre liste.');
      return;
    }
    onAddSuggestion({ name, family: css });
  }

  const hasRows = mergedLogo.length > 0 || mergedSite.length > 0;

  return (
    <div className="mb-8 rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50/90 to-white p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
            <Sparkles className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Suggestions</p>
            <p className="mt-0.5 max-w-xl text-xs text-gray-500">
              Détection automatique depuis votre URL ou votre logo SVG.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 shrink-0 gap-1.5 rounded-lg sm:mt-0"
          disabled={!coercePublicHttpUrl(websiteUrl) || siteLoading}
          onClick={() => void analyzeWebsite()}
        >
          {siteLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
          Analyser le site
        </Button>
      </div>

      {showBody && (
        <div className="mt-5 space-y-5">
          

          {logoLoading && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
              Lecture du fichier logo…
            </div>
          )}

          {hasRows && (
            <>
              {mergedLogo.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    Logo (max. 2)
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {mergedLogo.map((row) => (
                      <SuggestionFontCard
                        key={`logo-${row.label}`}
                        displayName={row.label}
                        cssFamily={row.css}
                        roleLabel={row.role}
                        onAdd={() => handleAddChip(row.label, row.css)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {mergedSite.length > 0 && (
                <div>
                  
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {mergedSite.map((row) => (
                      <SuggestionFontCard
                        key={`web-${row.label}-${row.role}`}
                        displayName={row.label}
                        cssFamily={row.css}
                        roleLabel={row.role}
                        onAdd={() => handleAddChip(row.label, row.css)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SuggestionFontCard({
  displayName,
  cssFamily,
  roleLabel,
  onAdd,
}: {
  displayName: string;
  cssFamily: string;
  roleLabel: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200/70 bg-white p-3 shadow-sm ring-1 ring-slate-900/[0.02] transition-colors hover:border-slate-300/80 hover:bg-slate-50/40">
      <p className="truncate text-[10px] font-medium uppercase tracking-wider text-slate-400">{roleLabel}</p>
      <BrandFontPreviewBlock
        cssFamily={cssFamily}
        titleInFont={displayName}
        webfontFamily={extractPrimaryFamilyFromStack(cssFamily)}
      />
      <div className="flex items-center gap-2 border-t border-slate-100 pt-2">
        <p className="min-w-0 flex-1 truncate font-mono text-[10px] text-slate-500" title={cssFamily}>
          {cssFamily}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 shrink-0 gap-1 rounded-lg border-slate-200 px-2.5 text-xs font-medium text-slate-700 shadow-none hover:bg-white hover:text-slate-900"
          onClick={onAdd}
        >
          <Plus className="h-3.5 w-3.5 stroke-[2]" />
          Ajouter
        </Button>
      </div>
    </div>
  );
}
