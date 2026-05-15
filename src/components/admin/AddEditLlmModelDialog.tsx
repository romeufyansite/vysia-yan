import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import type { PlatformLlmModelSummary, PlatformLlmProvider } from '@/types/platform-llm';
import {
  LLM_PROVIDER_META,
  LLM_QUICK_PRESETS,
  defaultBaseUrlForProvider,
} from '@/lib/llm-provider-presets';
import { platformLlmService } from '@/services/platform-llm.service';

const PRESET_NONE = '__none__';

interface AddEditLlmModelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Null = création ; sinon édition à partir des métadonnées déjà listées (aucune lecture du secret). */
  model: PlatformLlmModelSummary | null;
  onSaved: () => void;
}

export function AddEditLlmModelDialog({
  open,
  onOpenChange,
  model,
  onSaved,
}: AddEditLlmModelDialogProps) {
  const isEdit = !!model;
  const [saving, setSaving] = useState(false);
  const [presetId, setPresetId] = useState<string>(PRESET_NONE);
  const [displayName, setDisplayName] = useState('');
  const [provider, setProvider] = useState<PlatformLlmProvider>('openai');
  const [apiModelId, setApiModelId] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;

    setPresetId(PRESET_NONE);
    setApiKey('');

    if (!model) {
      setDisplayName('');
      setProvider('openai');
      setApiModelId('');
      setApiBaseUrl(defaultBaseUrlForProvider('openai'));
      setNotes('');
      return;
    }

    setDisplayName(model.display_name);
    setProvider(model.provider);
    setApiModelId(model.api_model_id);
    setApiBaseUrl(model.api_base_url ?? defaultBaseUrlForProvider(model.provider));
    setNotes(model.notes ?? '');
  }, [open, model]);

  const applyPreset = (id: string) => {
    setPresetId(id);
    if (id === PRESET_NONE) return;
    const p = LLM_QUICK_PRESETS.find((x) => x.id === id);
    if (!p) return;
    setProvider(p.provider);
    setDisplayName(p.displayName);
    setApiModelId(p.apiModelId);
    setApiBaseUrl(defaultBaseUrlForProvider(p.provider));
    if (p.hint) toast.message(p.hint);
  };

  const applyDefaultUrl = () => {
    setApiBaseUrl(defaultBaseUrlForProvider(provider));
    toast.success('URL de base mise à jour selon le fournisseur');
  };

  const docUrl = LLM_PROVIDER_META[provider].docUrl;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dn = displayName.trim();
    const mid = apiModelId.trim();
    if (!dn || !mid) {
      toast.error('Nom affiché et identifiant API sont requis');
      return;
    }

    const baseTrim = apiBaseUrl.trim();
    const keyTrim = apiKey.trim();

    if (!isEdit && !keyTrim) {
      toast.error('La clé API est requise à la création');
      return;
    }

    setSaving(true);
    try {
      if (!model) {
        await platformLlmService.createSecure({
          display_name: dn,
          provider,
          api_model_id: mid,
          api_base_url: baseTrim || null,
          api_key: keyTrim,
          notes: notes.trim() || null,
        });
        toast.success('Modèle ajouté — clé chiffrée côté serveur');
      } else {
        await platformLlmService.updateSecure(model.id, {
          display_name: dn,
          provider,
          api_model_id: mid,
          api_base_url: baseTrim || null,
          notes: notes.trim() || null,
          ...(keyTrim ? { api_key: keyTrim } : {}),
        });
        toast.success(keyTrim ? 'Modèle mis à jour — nouvelle clé enregistrée' : 'Modèle mis à jour');
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,760px)] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier le modèle' : 'Ajouter un modèle LLM'}</DialogTitle>
          <DialogDescription>
            La clé API transite une seule fois jusqu&apos;à une fonction Edge dédiée ; elle est chiffrée (AES-256-GCM)
            puis stockée hors accès PostgREST pour les navigateurs. Elle ne peut pas être relue depuis cette interface :
            pour changer de jeton, saisissez-en un nouveau.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="llm-preset">Modèle rapide</Label>
              <Select value={presetId} onValueChange={applyPreset}>
                <SelectTrigger id="llm-preset" className="rounded-xl">
                  <SelectValue placeholder="Choisir un preset ou personnaliser" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PRESET_NONE}>Personnaliser</SelectItem>
                  {LLM_QUICK_PRESETS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="llm-provider">Fournisseur</Label>
            <Select
              value={provider}
              onValueChange={(v) => {
                const next = v as PlatformLlmProvider;
                setProvider(next);
                setApiBaseUrl(defaultBaseUrlForProvider(next));
              }}
            >
              <SelectTrigger id="llm-provider" className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(LLM_PROVIDER_META) as PlatformLlmProvider[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {LLM_PROVIDER_META[k].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {docUrl ? (
              <a
                href={docUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                Documentation du fournisseur
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="llm-display">Nom affiché</Label>
            <Input
              id="llm-display"
              value={displayName}
              onChange={(ev) => setDisplayName(ev.target.value)}
              placeholder="ex. GPT-5, OPUS 4.7"
              className="rounded-xl"
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="llm-api-model">Identifiant API du modèle</Label>
            <Input
              id="llm-api-model"
              value={apiModelId}
              onChange={(ev) => setApiModelId(ev.target.value)}
              placeholder="ex. gpt-5, claude-opus-4-20250514"
              className="rounded-xl font-mono text-sm"
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="llm-base-url">URL de base (optionnel)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-lg text-xs"
                onClick={applyDefaultUrl}
              >
                URL recommandée
              </Button>
            </div>
            <Input
              id="llm-base-url"
              value={apiBaseUrl}
              onChange={(ev) => setApiBaseUrl(ev.target.value)}
              placeholder={defaultBaseUrlForProvider(provider) || 'https://…'}
              className="rounded-xl font-mono text-sm"
              autoComplete="off"
            />
            <p className="text-xs text-slate-500">
              Laissez vide ou adaptez pour Azure OpenAI (point de terminaison + version dans le chemin si besoin).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="llm-api-key">
              Clé API{' '}
              {isEdit
                ? '(saisir uniquement pour remplacer — la valeur actuelle n’est jamais affichée)'
                : ''}
            </Label>
            <Input
              id="llm-api-key"
              type="password"
              value={apiKey}
              onChange={(ev) => setApiKey(ev.target.value)}
              placeholder={isEdit ? 'Laisser vide pour conserver la clé chiffrée' : 'sk-… ou clé fournisseur'}
              className="rounded-xl font-mono text-sm"
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="llm-notes">Notes internes</Label>
            <Textarea
              id="llm-notes"
              value={notes}
              onChange={(ev) => setNotes(ev.target.value)}
              placeholder="Référence projet, quota, etc."
              className="min-h-[72px] rounded-xl text-sm"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving} className="rounded-xl">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement…
                </>
              ) : isEdit ? (
                'Enregistrer'
              ) : (
                'Ajouter'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
