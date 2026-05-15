import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Plus, Pencil, Trash2, Loader2, Sparkles, Lock } from 'lucide-react';
import { toast } from 'sonner';
import type { PlatformLlmModelSummary } from '@/types/platform-llm';
import { LLM_PROVIDER_META } from '@/lib/llm-provider-presets';
import { platformLlmService } from '@/services/platform-llm.service';
import { AddEditLlmModelDialog } from '@/components/admin/AddEditLlmModelDialog';

function formatShortDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function AdminAiManagementPage() {
  const [rows, setRows] = useState<PlatformLlmModelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRow, setEditRow] = useState<PlatformLlmModelSummary | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toggleBusyId, setToggleBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await platformLlmService.list();
      setRows(data);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Impossible de charger les modèles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditRow(null);
    setDialogOpen(true);
  };

  const openEdit = (row: PlatformLlmModelSummary) => {
    setEditRow(row);
    setDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await platformLlmService.remove(deleteId);
      toast.success('Modèle supprimé');
      setDeleteId(null);
      await load();
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Suppression impossible');
    }
  };

  const onToggle = async (row: PlatformLlmModelSummary, enabled: boolean) => {
    setToggleBusyId(row.id);
    try {
      await platformLlmService.setEnabled(row.id, enabled);
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, is_enabled: enabled } : r)));
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Mise à jour impossible');
    } finally {
      setToggleBusyId(null);
    }
  };

  return (
    <div className="h-full">
      <div className="border-b border-slate-200/80 bg-white px-8 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-medium tracking-tight text-slate-900">Gestion IA</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Référencez les modèles disponibles. Les jetons d&apos;API sont chiffrés côté serveur ; configurez au moins
              un modèle <span className="font-mono text-[13px]">deepseek-v4-flash</span> pour la description
              d&apos;entreprise.
            </p>
          </div>
          <Button onClick={openCreate} className="h-11 shrink-0 gap-2 rounded-xl shadow-md shadow-primary/15">
            <Plus className="h-4 w-4" />
            Ajouter un modèle
          </Button>
        </div>
      </div>

      <div className="space-y-6 p-8">
        <Alert className="rounded-2xl border-emerald-200/90 bg-emerald-50/90 text-emerald-950">
          <Lock className="h-4 w-4 text-emerald-800" />
          <AlertTitle className="text-emerald-950">Secrets protégés</AlertTitle>
          <AlertDescription className="text-emerald-950/90">
            Les clés ne sont jamais renvoyées au navigateur après enregistrement : elles sont chiffrées côté serveur et
            stockées dans une table inaccessible aux sessions JWT standards.
          </AlertDescription>
        </Alert>

        <Alert className="rounded-2xl border-sky-200 bg-sky-50 text-sky-950">
          <Sparkles className="h-4 w-4 text-sky-700" />
          <AlertTitle className="text-sky-950">Identifiants qui évoluent</AlertTitle>
          <AlertDescription className="text-sky-900/90">
            Les fournisseurs renomment et retirent des modèles régulièrement. Vérifiez toujours la documentation avant la
            mise en production.
          </AlertDescription>
        </Alert>

        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/5">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-9 w-9 animate-spin text-slate-400" />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
              <p className="max-w-md text-sm text-slate-600">
                Aucun modèle configuré. Ajoutez votre premier LLM (OpenAI, Anthropic, Google AI, DeepSeek, Azure ou
                endpoint personnalisé).
              </p>
              <Button onClick={openCreate} variant="secondary" className="rounded-xl">
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un modèle
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200/80 hover:bg-transparent">
                  <TableHead className="w-[72px] text-center">Actif</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead className="hidden md:table-cell">ID API</TableHead>
                  <TableHead className="hidden lg:table-cell">URL de base</TableHead>
                  <TableHead className="hidden sm:table-cell">Clé</TableHead>
                  <TableHead className="hidden xl:table-cell">Mis à jour</TableHead>
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} className="border-slate-200/80">
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Switch
                          checked={row.is_enabled}
                          disabled={toggleBusyId === row.id}
                          onCheckedChange={(v) => onToggle(row, v)}
                          aria-label={`Activer ${row.display_name}`}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">{row.display_name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="rounded-lg font-normal">
                        {LLM_PROVIDER_META[row.provider]?.label ?? row.provider}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden max-w-[200px] truncate font-mono text-xs text-slate-700 md:table-cell">
                      <span title={row.api_model_id}>{row.api_model_id}</span>
                    </TableCell>
                    <TableCell className="hidden max-w-[240px] truncate font-mono text-xs text-slate-600 lg:table-cell">
                      <span title={row.api_base_url ?? '(défaut fournisseur)'}>
                        {row.api_base_url?.trim() || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {row.secret_configured ? (
                        <Badge
                          variant="outline"
                          className="rounded-lg border-emerald-200 bg-emerald-50 text-emerald-800"
                        >
                          Secrète chiffrée
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="rounded-lg border-amber-200 bg-amber-50 text-amber-900"
                          title="Utiliser Modifier pour ajouter ou remplacer la clé API"
                        >
                          Clé manquante
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap text-xs text-slate-500 xl:table-cell">
                      {formatShortDate(row.updated_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-lg text-slate-600"
                          onClick={() => openEdit(row)}
                          aria-label={`Modifier ${row.display_name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setDeleteId(row.id)}
                          aria-label={`Supprimer ${row.display_name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <AddEditLlmModelDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditRow(null);
        }}
        model={editRow}
        onSaved={() => void load()}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce modèle ?</AlertDialogTitle>
            <AlertDialogDescription>
              La configuration et la clé associées seront retirées. Les fonctionnalités qui s&apos;appuient sur ce modèle
              devront être reconfigurées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDelete()}
              className="rounded-xl bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
