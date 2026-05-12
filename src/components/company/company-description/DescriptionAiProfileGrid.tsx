import { Sparkles } from 'lucide-react';
import type {
  CompanyDescriptionAiProfile,
  CompanyDescriptionAiVisualDirection,
  CompanyDescriptionAiWritingStyle,
} from '@/types/company-description-ai';
import { ProfileCardBlock } from '@/components/company/company-description/ProfileCardBlock';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface DescriptionAiProfileGridProps {
  profile: CompanyDescriptionAiProfile;
  editable?: boolean;
  onChange?: (next: CompanyDescriptionAiProfile) => void;
}

const WS_ROWS: { label: string; key: keyof CompanyDescriptionAiWritingStyle }[] = [
  { label: 'Ton', key: 'tone' },
  { label: 'Formalité', key: 'formality' },
  { label: 'Vocabulaire', key: 'vocabulary' },
  { label: 'Perspective', key: 'perspective' },
];

const VD_ROWS: { label: string; key: keyof CompanyDescriptionAiVisualDirection }[] = [
  { label: 'Ambiance', key: 'mood' },
  { label: 'Imageries', key: 'imagery' },
  { label: 'Mise en page', key: 'layout_hint' },
  { label: 'Couleurs', key: 'color_association' },
];

const fieldBase =
  'rounded-lg border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400';

export function DescriptionAiProfileGrid({
  profile,
  editable = false,
  onChange,
}: DescriptionAiProfileGridProps) {
  const ws = profile.writing_style ?? {};
  const vd = profile.visual_direction ?? {};

  const patchProfile = (partial: Partial<CompanyDescriptionAiProfile>) => {
    onChange?.({ ...profile, ...partial });
  };

  const patchWs = (key: keyof CompanyDescriptionAiWritingStyle, value: string) => {
    onChange?.({
      ...profile,
      writing_style: { ...ws, [key]: value },
    });
  };

  const patchVd = (key: keyof CompanyDescriptionAiVisualDirection, value: string) => {
    onChange?.({
      ...profile,
      visual_direction: { ...vd, [key]: value },
    });
  };

  if (editable && onChange) {
    const offeringsText = (profile.key_offerings ?? []).join('\n');
    const keywordsText = (profile.keywords_for_visuals ?? []).join(', ');

    return (
      <section className="rounded-2xl bg-slate-50 p-7  ring-1 ring-slate-900/[0.02] sm:p-9">
        <div className="mb-5 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-600" aria-hidden />
          <h2 className="text-base font-semibold tracking-tight text-slate-900">Synthèse</h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <ProfileCardBlock title="Synthèse">
            <Textarea
              value={profile.summary ?? ''}
              onChange={(e) => patchProfile({ summary: e.target.value })}
              rows={5}
              className={cn(fieldBase, 'min-h-[120px] resize-y')}
              placeholder="Résumé…"
            />
          </ProfileCardBlock>

          <ProfileCardBlock title="Style d’écriture recommandé">
            <dl className="space-y-3">
              {WS_ROWS.map(({ label, key }) => (
                <div key={key}>
                  <dt className="mb-1 text-xs font-medium text-slate-500">{label}</dt>
                  <dd>
                    <Input
                      value={typeof ws[key] === 'string' ? ws[key] : ''}
                      onChange={(e) => patchWs(key, e.target.value)}
                      className={cn(fieldBase, 'h-10')}
                    />
                  </dd>
                </div>
              ))}
            </dl>
          </ProfileCardBlock>

          <ProfileCardBlock title="Direction visuelle">
            <dl className="space-y-3">
              {VD_ROWS.map(({ label, key }) => (
                <div key={key}>
                  <dt className="mb-1 text-xs font-medium text-slate-500">{label}</dt>
                  <dd>
                    <Input
                      value={typeof vd[key] === 'string' ? vd[key] : ''}
                      onChange={(e) => patchVd(key, e.target.value)}
                      className={cn(fieldBase, 'h-10')}
                    />
                  </dd>
                </div>
              ))}
            </dl>
          </ProfileCardBlock>

          <ProfileCardBlock title="Personnalité de marque">
            <Textarea
              value={profile.brand_personality ?? ''}
              onChange={(e) => patchProfile({ brand_personality: e.target.value })}
              rows={4}
              className={cn(fieldBase, 'min-h-[100px] resize-y')}
            />
          </ProfileCardBlock>

          <ProfileCardBlock title="Public cible">
            <Textarea
              value={profile.target_audience ?? ''}
              onChange={(e) => patchProfile({ target_audience: e.target.value })}
              rows={4}
              className={cn(fieldBase, 'min-h-[100px] resize-y')}
            />
          </ProfileCardBlock>

          <ProfileCardBlock title="Offres clés">
            <Textarea
              value={offeringsText}
              onChange={(e) => {
                const lines = e.target.value
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean);
                patchProfile({ key_offerings: lines });
              }}
              rows={5}
              className={cn(fieldBase, 'min-h-[120px] resize-y')}
              placeholder="Une offre par ligne"
            />
          </ProfileCardBlock>

          <ProfileCardBlock title="Mots-clés visuels">
            <Textarea
              value={keywordsText}
              onChange={(e) => {
                const parts = e.target.value
                  .split(/[,;\n]+/)
                  .map((s) => s.trim())
                  .filter(Boolean);
                patchProfile({ keywords_for_visuals: parts });
              }}
              rows={3}
              className={cn(fieldBase, 'resize-y')}
              placeholder="Séparés par des virgules"
            />
          </ProfileCardBlock>

          <ProfileCardBlock title="À éviter / contraintes" className="lg:col-span-2">
            <Textarea
              value={profile.avoid_or_constraints ?? ''}
              onChange={(e) => patchProfile({ avoid_or_constraints: e.target.value })}
              rows={4}
              className={cn(fieldBase, 'min-h-[100px] w-full resize-y')}
            />
          </ProfileCardBlock>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-slate-50 p-7  ring-1 ring-slate-900/[0.02] sm:p-9">
      <div className="mb-5 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-violet-600" aria-hidden />
        <h2 className="text-base font-semibold tracking-tight text-slate-900">Synthèse</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {profile.summary?.trim() ? (
          <ProfileCardBlock title="Synthèse">
            <p className="text-xs leading-relaxed text-slate-500">{profile.summary}</p>
          </ProfileCardBlock>
        ) : null}

        {profile.writing_style &&
        Object.values(profile.writing_style).some((v) => typeof v === 'string' && v.trim()) ? (
          <ProfileCardBlock title="Style d’écriture recommandé">
            <dl className="space-y-2 text-xs text-slate-500">
              {[
                ['Ton', profile.writing_style.tone],
                ['Formalité', profile.writing_style.formality],
                ['Vocabulaire', profile.writing_style.vocabulary],
                ['Perspective', profile.writing_style.perspective],
              ].map(([k, v]) =>
                typeof v === 'string' && v.trim() ? (
                  <div key={String(k)}>
                    <dt className="font-medium text-xs text-slate-700">{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ) : null,
              )}
            </dl>
          </ProfileCardBlock>
        ) : null}

        {profile.visual_direction &&
        Object.values(profile.visual_direction).some((v) => typeof v === 'string' && v.trim()) ? (
          <ProfileCardBlock title="Direction visuelle">
            <dl className="space-y-2 text-xs text-slate-500">
              {[
                ['Ambiance', profile.visual_direction.mood],
                ['Imageries', profile.visual_direction.imagery],
                ['Mise en page', profile.visual_direction.layout_hint],
                ['Couleurs', profile.visual_direction.color_association],
              ].map(([k, v]) =>
                typeof v === 'string' && v.trim() ? (
                  <div key={String(k)}>
                    <dt className="font-medium text-xs text-slate-700">{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ) : null,
              )}
            </dl>
          </ProfileCardBlock>
        ) : null}

        {profile.brand_personality?.trim() ? (
          <ProfileCardBlock title="Personnalité de marque">
            <p className="text-xs leading-relaxed text-slate-500">{profile.brand_personality}</p>
          </ProfileCardBlock>
        ) : null}

        {profile.target_audience?.trim() ? (
          <ProfileCardBlock title="Public cible">
            <p className="text-xs leading-relaxed text-slate-500">{profile.target_audience}</p>
          </ProfileCardBlock>
        ) : null}

        {Array.isArray(profile.key_offerings) && profile.key_offerings.length > 0 ? (
          <ProfileCardBlock title="Offres clés">
            <ul className="list-inside list-disc space-y-1 text-xs text-slate-500">
              {profile.key_offerings.map((x, i) =>
                typeof x === 'string' && x.trim() ? <li key={i}>{x.trim()}</li> : null,
              )}
            </ul>
          </ProfileCardBlock>
        ) : null}

        {Array.isArray(profile.keywords_for_visuals) && profile.keywords_for_visuals.length > 0 ? (
          <ProfileCardBlock title="Mots-clés visuels">
            <div className="flex flex-wrap gap-2">
              {profile.keywords_for_visuals.map((x, i) =>
                typeof x === 'string' && x.trim() ? (
                  <span
                    key={i}
                    className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500"
                  >
                    {x.trim()}
                  </span>
                ) : null,
              )}
            </div>
          </ProfileCardBlock>
        ) : null}

        {profile.avoid_or_constraints?.trim() ? (
          <ProfileCardBlock title="À éviter / contraintes" className="lg:col-span-2">
            <p className="text-xs leading-relaxed text-slate-500">{profile.avoid_or_constraints}</p>
          </ProfileCardBlock>
        ) : null}
      </div>
    </section>
  );
}
