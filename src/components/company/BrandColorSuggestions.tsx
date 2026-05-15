import { useCallback, useEffect, useMemo, useState } from 'react';
import { Globe, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { frenchColorLabelFromHex } from '@/lib/brand-color-label';
import { extractDominantColorsFromImageUrl } from '@/lib/extract-colors-from-image';
import { normalizedHexUpper } from '@/lib/normalize-brand-hex';
import type { BrandColor } from '@/services/organization.service';
import { fetchWebsiteBrandColorSuggestions } from '@/services/brand-colors.service';

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

function normalizedPaletteHexSet(colors: BrandColor[]): Set<string> {
  const out = new Set<string>();
  for (const c of colors) {
    const n = normalizedHexUpper(c.hex);
    if (n) out.add(n);
  }
  return out;
}

export interface BrandColorSuggestionsProps {
  logoUrl: string | null;
  websiteUrl: string;
  savedColors: BrandColor[];
  onAddSuggestion: (hex: string) => void;
}

export function BrandColorSuggestions({
  logoUrl,
  websiteUrl,
  savedColors,
  onAddSuggestion,
}: BrandColorSuggestionsProps) {
  const [logoHexes, setLogoHexes] = useState<string[]>([]);
  const [websiteHexes, setWebsiteHexes] = useState<string[]>([]);
  const [logoLoading, setLogoLoading] = useState(false);
  const [siteLoading, setSiteLoading] = useState(false);
  const [logoHint, setLogoHint] = useState<string | null>(null);

  const paletteHexSet = useMemo(() => normalizedPaletteHexSet(savedColors), [savedColors]);

  useEffect(() => {
    let cancelled = false;

    async function analyzeLogo(url: string) {
      setLogoLoading(true);
      setLogoHint(null);
      try {
        const hues = await extractDominantColorsFromImageUrl(url, 6);
        if (cancelled) return;
        setLogoHexes(hues);
        if (hues.length === 0) {
          setLogoHint(
            "La palette n’a pas pu être extraite automatiquement (image ou contraintes d’accès). Vous pouvez analyser votre site ou ajouter des couleurs manuellement.",
          );
        }
      } finally {
        if (!cancelled) setLogoLoading(false);
      }
    }

    if (!logoUrl?.trim()) {
      setLogoHexes([]);
      setLogoHint(null);
      setLogoLoading(false);
      return;
    }

    const handle = window.setTimeout(() => {
      void analyzeLogo(logoUrl);
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [logoUrl]);

  const filteredLogo = useMemo(
    () => logoHexes.filter((h) => normalizedHexUpper(h) && !paletteHexSet.has(normalizedHexUpper(h)!)),
    [logoHexes, paletteHexSet],
  );
  const filteredWebsite = useMemo(
    () => websiteHexes.filter((h) => normalizedHexUpper(h) && !paletteHexSet.has(normalizedHexUpper(h)!)),
    [websiteHexes, paletteHexSet],
  );

  const analyzeWebsite = useCallback(async () => {
    const resolved = coercePublicHttpUrl(websiteUrl);
    if (!resolved) {
      toast.error('Saisissez une URL web valide (ex. exemple.com)');
      setWebsiteHexes([]);
      return;
    }
    setSiteLoading(true);
    try {
      const hues = await fetchWebsiteBrandColorSuggestions(resolved);
      setWebsiteHexes(hues);
      if (!hues.length) {
        toast.message('Peu ou pas de couleurs marquantes détectées sur la page.', { duration: 4500 });
      }
    } catch (e) {
      console.error('[BrandColorSuggestions] site analysis', e);
      setWebsiteHexes([]);
      toast.error(e instanceof Error ? e.message : "Impossible d'analyser le site web pour le moment");
    } finally {
      setSiteLoading(false);
    }
  }, [websiteUrl]);

  const hasRows = filteredLogo.length > 0 || filteredWebsite.length > 0;
  const logoReady = !!logoUrl?.trim();
  const siteUrlOk = coercePublicHttpUrl(websiteUrl) !== null;
  const showBody = logoReady || siteUrlOk;

  return (
    <div className="mb-8 rounded-xl border border-slate-200/70 bg-gradient-to-br from-slate-50/90 to-white p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
            <Sparkles className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Suggestions</p>
            <p className="mt-0.5 text-xs text-gray-500 max-w-xl">
              Couleurs détectées sur votre logo (automatiquement) et sur votre site après analyse sur demande.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 rounded-lg gap-1.5 mt-2 sm:mt-0"
          disabled={!siteUrlOk || siteLoading}
          onClick={() => {
            void analyzeWebsite();
          }}
        >
          {siteLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
          Analyser le site
        </Button>
      </div>

      {showBody && (
        <div className="mt-4 space-y-4">
          {siteUrlOk && !logoReady && !hasRows && !logoLoading && !siteLoading && (
            <p className="text-xs text-gray-500">
              Une analyse du logo s’affiche ici automatiquement. Pour le site, utilisez{' '}
              <span className="font-medium text-gray-600">Analyser le site</span>.
            </p>
          )}

          {logoLoading && logoReady && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
              Analyse du logo…
            </div>
          )}

          {!logoLoading && logoHint && (
            <p className="text-xs text-amber-800/90 bg-amber-50/80 rounded-lg px-3 py-2 border border-amber-100">{logoHint}</p>
          )}

          {hasRows && (
            <>
              {filteredLogo.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">
                    Logo
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {filteredLogo.map((hexRaw) => {
                      const hex = normalizedHexUpper(hexRaw);
                      if (!hex) return null;
                      return (
                        <SuggestionChip
                          key={`logo-${hex}`}
                          title={frenchColorLabelFromHex(hex)}
                          subtitle={hex}
                          source="logo"
                          onAdd={() => onAddSuggestion(hex)}
                          swatchHex={hex}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {filteredWebsite.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">
                    Site web
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {filteredWebsite.map((hexRaw) => {
                      const hex = normalizedHexUpper(hexRaw);
                      if (!hex) return null;
                      return (
                        <SuggestionChip
                          key={`web-${hex}`}
                          title={frenchColorLabelFromHex(hex)}
                          subtitle={hex}
                          source="site"
                          onAdd={() => onAddSuggestion(hex)}
                          swatchHex={hex}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {!logoReady && !siteUrlOk && (
        <p className="mt-3 text-xs text-gray-400">
          Téléchargez un logo ou renseignez l’URL de votre site pour obtenir des suggestions.
        </p>
      )}
    </div>
  );
}

function SuggestionChip({
  title,
  subtitle,
  source,
  onAdd,
  swatchHex,
}: {
  title: string;
  subtitle: string;
  source: 'logo' | 'site';
  onAdd: () => void;
  swatchHex: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white pl-2 pr-1 py-1 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div
        className="h-8 w-8 shrink-0 rounded-lg border border-black/10 shadow-inner"
        style={{ backgroundColor: swatchHex }}
      />
      <div className="flex flex-col min-w-0 pr-1">
        <span className="text-xs font-semibold text-gray-900 leading-tight truncate max-w-[7.5rem]">{title}</span>
        <span className="text-[11px] text-gray-500 font-mono uppercase tracking-tight">{subtitle}</span>
        <span className="text-[10px] text-gray-400">
          {source === 'logo' ? 'Extrait du logo' : 'Déduit de la page'}
        </span>
      </div>
      <Button type="button" size="sm" variant="secondary" className="h-7 px-2.5 rounded-lg text-xs shrink-0" onClick={onAdd}>
        Ajouter
      </Button>
    </div>
  );
}
