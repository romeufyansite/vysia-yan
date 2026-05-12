import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, FileText, Loader2, PenLine, RefreshCw, Save, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DescriptionAiProfileGrid } from '@/components/company/company-description/DescriptionAiProfileGrid';
import { DescriptionStep1Chat } from '@/components/company/company-description/DescriptionStep1Chat';
import { DescriptionStepsHeader } from '@/components/company/company-description/DescriptionStepsHeader';
import { organizationService, type Organization } from '@/services/organization.service';
import { companyDescriptionAiService } from '@/services/company-description-ai.service';
import type { CompanyDescriptionAiProfile } from '@/types/company-description-ai';
import { clearCompanyDescStep1Chat } from '@/lib/company-desc-step1-chat-storage';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CompanyDescriptionTabProps {
  organization: Organization;
  onUpdate: (org: Organization) => void;
}

const MIN_STEP1_CHARS = 40;

function prefillStorageKey(orgId: string): string {
  return `company-desc-ai-prefill-done:${orgId}`;
}

function parseAiProfile(raw: Organization['company_description_ai']): CompanyDescriptionAiProfile {
  if (!raw || typeof raw !== 'object') return {};
  return raw as CompanyDescriptionAiProfile;
}

function aiProfileHasContent(p: CompanyDescriptionAiProfile): boolean {
  if (p.summary?.trim()) return true;
  if (Array.isArray(p.key_offerings) && p.key_offerings.length > 0) return true;
  if (Array.isArray(p.keywords_for_visuals) && p.keywords_for_visuals.length > 0) return true;
  if (p.brand_personality?.trim() || p.target_audience?.trim()) return true;
  const ws = p.writing_style;
  if (ws && Object.values(ws).some((v) => typeof v === 'string' && v.trim())) return true;
  const vd = p.visual_direction;
  if (vd && Object.values(vd).some((v) => typeof v === 'string' && v.trim())) return true;
  return false;
}

function initialWizardStep(org: Organization): 1 | 2 {
  const p = parseAiProfile(org.company_description_ai);
  const d = (org.company_description ?? '').trim();
  return aiProfileHasContent(p) && d.length >= MIN_STEP1_CHARS ? 2 : 1;
}

function cloneAiProfile(p: CompanyDescriptionAiProfile): CompanyDescriptionAiProfile {
  return structuredClone(p);
}

export function CompanyDescriptionTab({ organization, onUpdate }: CompanyDescriptionTabProps) {
  const [step, setStep] = useState<1 | 2>(() => initialWizardStep(organization));
  const [description, setDescription] = useState(organization.company_description ?? '');
  const [aiProfile, setAiProfile] = useState<CompanyDescriptionAiProfile>(() =>
    parseAiProfile(organization.company_description_ai),
  );
  const [synthesisEditing, setSynthesisEditing] = useState(false);
  const [synthesisDraft, setSynthesisDraft] = useState<CompanyDescriptionAiProfile>({});
  const [savingDraft, setSavingDraft] = useState(false);
  const [savingSynthesis, setSavingSynthesis] = useState(false);
  const [deletingSynthesis, setDeletingSynthesis] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [prefilling, setPrefilling] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);

  const website = organization.website?.trim();
  const descLen = description.trim().length;

  const canValidateStep1 =
    descLen >= MIN_STEP1_CHARS &&
    !prefilling &&
    !analyzing &&
    !chatBusy;

  useEffect(() => {
    setDescription(organization.company_description ?? '');
    if (!synthesisEditing) {
      setAiProfile(parseAiProfile(organization.company_description_ai));
    }
  }, [
    organization.id,
    organization.company_description,
    organization.company_description_ai,
    synthesisEditing,
  ]);

  useEffect(() => {
    setStep(initialWizardStep(organization));
    setDeleteDialogOpen(false);
  }, [organization.id]);

  const handlePersistWebsiteOnly = useCallback(
    async (normalizedUrl: string) => {
      if ((organization.website ?? '').trim() === normalizedUrl) return;
      const updated = await organizationService.updateOrganization(organization.id, {
        website: normalizedUrl,
      });
      onUpdate(updated);
    },
    [organization.id, organization.website, onUpdate],
  );

  const handleConversationDraft = useCallback((draft: string) => {
    setDescription(draft);
  }, []);

  const handlePrefillFromWebsite = useCallback(
    async (normalizedUrl: string) => {
      setPrefilling(true);
      try {
        const result = await companyDescriptionAiService.prefillFromWebsite(
          organization.id,
          normalizedUrl,
        );
        if (result.kind === 'complete') {
          const draft = result.draft;
          const updates: {
            company_description: string;
            website?: string | null;
          } = { company_description: draft };
          if ((organization.website ?? '').trim() !== normalizedUrl) {
            updates.website = normalizedUrl;
          }
          const updated = await organizationService.updateOrganization(organization.id, updates);
          setDescription(draft);
          onUpdate(updated);
          sessionStorage.setItem(prefillStorageKey(organization.id), '1');
          return { status: 'applied' as const };
        }
        return {
          status: 'needs_more_questions' as const,
          assistantMessage: result.assistantMessage,
          siteContextForAi: result.siteContextForAi,
        };
      } finally {
        setPrefilling(false);
      }
    },
    [organization.id, organization.website, onUpdate],
  );

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const updated = await organizationService.updateOrganization(organization.id, {
        company_description: description.trim() || null,
      });
      onUpdate(updated);
      toast.success('Enregistré');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleRegenerateFromSite = async () => {
    const site = organization.website?.trim();
    if (!site) {
      toast.error('Pas de site enregistré');
      return;
    }
    setPrefilling(true);
    try {
      const result = await companyDescriptionAiService.prefillFromWebsite(organization.id, site);
      if (result.kind === 'needs_follow_up') {
        toast.info(
          'Le site ne fournit pas assez de détails pour régénérer seul le texte. Complétez via le chat à l’étape 1.',
        );
        return;
      }
      const draft = result.draft;
      const updated = await organizationService.updateOrganization(organization.id, {
        company_description: draft,
      });
      setDescription(draft);
      onUpdate(updated);
      sessionStorage.setItem(prefillStorageKey(organization.id), '1');
      toast.success('Texte régénéré');
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Échec');
    } finally {
      setPrefilling(false);
    }
  };

  const handleValidateStep1 = async () => {
    const text = description.trim();
    if (text.length < MIN_STEP1_CHARS) {
      toast.error(`Minimum ${MIN_STEP1_CHARS} caractères.`);
      return;
    }
    setAnalyzing(true);
    try {
      const profile = await companyDescriptionAiService.analyzeDescription(organization.id, text);
      setAiProfile(profile);
      const updated = await organizationService.updateOrganization(organization.id, {
        company_description: text,
        company_description_ai: profile,
      });
      onUpdate(updated);
      clearCompanyDescStep1Chat(organization.id);
      setSynthesisEditing(false);
      setStep(2);
      toast.success('Synthèse enregistrée');
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Analyse impossible');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleStartSynthesisEdit = () => {
    setSynthesisDraft(cloneAiProfile(aiProfile));
    setSynthesisEditing(true);
  };

  const handleSaveSynthesis = async () => {
    if (!aiProfileHasContent(synthesisDraft)) {
      toast.error('La synthèse ne peut pas être vide.');
      return;
    }
    setSavingSynthesis(true);
    try {
      const updated = await organizationService.updateOrganization(organization.id, {
        company_description_ai: synthesisDraft,
      });
      onUpdate(updated);
      setSynthesisEditing(false);
      toast.success('Enregistré');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSavingSynthesis(false);
    }
  };

  const handleToggleSynthesisEditSave = () => {
    if (synthesisEditing) {
      void handleSaveSynthesis();
    } else {
      handleStartSynthesisEdit();
    }
  };

  const handleDeleteSynthesis = async () => {
    setDeletingSynthesis(true);
    try {
      const updated = await organizationService.updateOrganization(organization.id, {
        company_description: null,
        /** Colonne jsonb NOT NULL en base — utiliser {} et non null. */
        company_description_ai: {},
      });
      clearCompanyDescStep1Chat(organization.id);
      sessionStorage.removeItem(prefillStorageKey(organization.id));
      setDescription('');
      setAiProfile({});
      setSynthesisDraft({});
      setSynthesisEditing(false);
      setStep(1);
      onUpdate(updated);
      setDeleteDialogOpen(false);
      toast.success('Synthèse et description supprimées');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Suppression impossible');
    } finally {
      setDeletingSynthesis(false);
    }
  };

  const showAiProfile = aiProfileHasContent(aiProfile);

  return (
    <div className="pb-24">
      <section className="rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-8 sm:py-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
              <FileText className="h-5 w-5 text-slate-700" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">Description</h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                <Sparkles className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                
                <span className="text-slate-400">·</span>
                <span>Générer une description précise de votre entreprise avec notre assistant IA</span>
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 pb-8 pt-6 sm:px-8">
          {step === 1 ? (
            <>
              <DescriptionStepsHeader currentStep={1} />

              <DescriptionStep1Chat
                key={`s1-${organization.id}`}
                orgId={organization.id}
                existingWebsite={website ?? null}
                onBusyChange={setChatBusy}
                onPersistWebsiteUrl={handlePersistWebsiteOnly}
                onConversationDraft={handleConversationDraft}
                onPrefillFromWebsite={handlePrefillFromWebsite}
              />

              {descLen > 0 ? (
                <>
                  <div className="mt-6 space-y-2">
                    <Label htmlFor="company-description" className="text-slate-700">
                      Texte de présentation
                    </Label>
                    <Textarea
                      id="company-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={prefilling || analyzing}
                      placeholder="Le chat vous guide ; le texte apparaît ici pour retouches."
                      className="min-h-[200px] resize-y rounded-xl border-slate-200 text-[15px] leading-relaxed"
                    />
                    {website ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 gap-2 px-2 text-slate-600 hover:text-slate-900"
                        onClick={() => void handleRegenerateFromSite()}
                        disabled={prefilling || analyzing || chatBusy}
                      >
                        <RefreshCw className={cn('h-3.5 w-3.5', prefilling && 'animate-spin')} />
                        Régénérer depuis le site enregistré
                      </Button>
                    ) : null}
                  </div>

                  <p
                    className={cn(
                      'mt-6 text-xs',
                      descLen >= MIN_STEP1_CHARS ? 'text-emerald-700' : 'text-slate-400',
                    )}
                  >
                    {MIN_STEP1_CHARS} caractères minimum · {descLen}
                  </p>
                </>
              ) : null}
              <div className={cn('flex flex-wrap gap-2', descLen > 0 ? 'mt-4' : 'mt-6')}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleSaveDraft()}
                  disabled={savingDraft || prefilling || analyzing}
                  className="h-10 gap-2 rounded-xl border-slate-200"
                >
                  {savingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Brouillon
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleValidateStep1()}
                  disabled={!canValidateStep1}
                  className="h-10 gap-2 rounded-xl"
                >
                  {analyzing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  Analyse · étape suivante
                </Button>
              </div>
            </>
          ) : (
            <>
              <DescriptionStepsHeader currentStep={2} />

              <p className="mb-6 text-sm text-slate-600">
                Voici une synthèse des éléments importants pour votre entreprise, vous pouvez la modifier ou la supprimer et recommencer à l'étape 1.
              </p>

              {showAiProfile ? (
                <>
                  <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
                    <Button
                      type="button"
                      onClick={() => void handleToggleSynthesisEditSave()}
                      disabled={savingSynthesis || deletingSynthesis}
                      className="h-10 min-h-10 gap-2 rounded-xl"
                    >
                      {savingSynthesis ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : synthesisEditing ? (
                        <Save className="h-4 w-4" aria-hidden />
                      ) : (
                        <PenLine className="h-4 w-4" aria-hidden />
                      )}
                      {synthesisEditing ? 'Enregistrer' : 'Modifier'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={deletingSynthesis || synthesisEditing}
                      onClick={() => setDeleteDialogOpen(true)}
                      aria-label="Supprimer la synthèse"
                      title="Supprimer la synthèse"
                      className="h-10 min-h-10 w-10 min-w-10 shrink-0 rounded-xl border-red-200 bg-white text-red-700 hover:bg-red-50 hover:text-red-800"
                    >
                      <Trash2 className="h-[1.35rem] w-[1.35rem]" />
                    </Button>
                  </div>

                  <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <AlertDialogContent className="rounded-2xl sm:rounded-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer la synthèse&nbsp;?</AlertDialogTitle>
                        <AlertDialogDescription>
                          La synthèse, le texte de présentation et l’historique du chat avec l’assistant
                          seront effacés. Vous reviendrez à l’étape&nbsp;1.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
                        <Button
                          type="button"
                          variant="destructive"
                          className="rounded-xl"
                          disabled={deletingSynthesis}
                          onClick={() => void handleDeleteSynthesis()}
                        >
                          {deletingSynthesis ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          ) : (
                            'Supprimer'
                          )}
                        </Button>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <DescriptionAiProfileGrid
                    profile={synthesisEditing ? synthesisDraft : aiProfile}
                    editable={synthesisEditing}
                    onChange={synthesisEditing ? setSynthesisDraft : undefined}
                  />
                </>
              ) : (
                <p className="text-sm text-amber-800">Relancez l’analyse depuis l’étape 1.</p>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
