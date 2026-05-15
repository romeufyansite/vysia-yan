import type { ReactNode } from 'react';
import { Crown, Mail, Pencil, Shield, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TeamRow } from '@/services/team.service';
import { ALL_RESOURCES } from '@/lib/permissions';

interface TeamMembersSectionProps {
  rows: TeamRow[];
  canInviteOrManage: boolean;
  onEdit: (row: TeamRow) => void;
  onRemove: (row: TeamRow) => void;
}

export function TeamMembersSection({
  rows,
  canInviteOrManage,
  onEdit,
  onRemove,
}: TeamMembersSectionProps) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-200/60">
      <header className="flex flex-wrap items-end justify-between gap-3 px-5 py-5 sm:px-7 sm:py-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-normal tracking-tight text-slate-900">Membres</h2>
            <span
              className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal tabular-nums text-slate-600"
              aria-live="polite"
            >
              {rows.length}
            </span>
          </div>
         
        </div>
      </header>

      <div className="border-t border-slate-100">
        {rows.length === 0 ? (
          <div className="px-5 py-16 text-center sm:px-7">
            <p className="text-sm font-normal text-slate-500">
              Aucun membre pour le moment — invitez un équipier pour commencer.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((row) => (
              <li key={`${row.kind}-${row.id}`}>
                <MemberRow
                  row={row}
                  canManage={canInviteOrManage}
                  onEdit={() => onEdit(row)}
                  onRemove={() => onRemove(row)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

interface MemberRowProps {
  row: TeamRow;
  canManage: boolean;
  onEdit: () => void;
  onRemove: () => void;
}

function MemberRow({ row, canManage, onEdit, onRemove }: MemberRowProps) {
  const isManager = row.role === 'manager';
  const isPending = row.kind === 'invitation';
  const displayName = [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
  const initials = (displayName || row.email || '?').trim().charAt(0).toUpperCase();
  const activePerms = Object.entries(row.permissions ?? {})
    .filter(([, p]) => p?.view || p?.manage)
    .map(([key]) => ALL_RESOURCES.find((r) => r.id === key)?.label)
    .filter(Boolean) as string[];

  const showActions = canManage && !isManager;

  return (
    <article className="transition-colors hover:bg-slate-50/[0.65]">
      <div className="flex flex-col gap-4 px-5 py-5 sm:px-7 sm:py-6 lg:flex-row lg:items-start lg:gap-6">
        {/* Avatar */}
        <div className="shrink-0">
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-2xl text-base font-normal text-white shadow-sm ring-[3px] ring-white sm:h-[52px] sm:w-[52px]',
              isManager &&
                'bg-gradient-to-br from-amber-400 via-amber-500 to-orange-400',
              isPending && 'bg-gradient-to-br from-slate-400 to-slate-500',
              !isManager && !isPending && 'bg-gradient-to-br from-blue-500 to-indigo-600'
            )}
            aria-hidden
          >
            {isPending ? <Mail className="h-5 w-5 opacity-95" strokeWidth={1.75} /> : initials}
          </div>
        </div>

        {/* Contenu principal */}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            {displayName ? (
              <span className="text-[15px] font-normal text-slate-900">{displayName}</span>
            ) : row.email ? (
              <span className="truncate text-[15px] font-normal text-slate-900">{row.email}</span>
            ) : (
              <span className="text-[15px] font-normal text-slate-400">Sans nom</span>
            )}

            {isManager && <RoleBadge tone="amber" icon={<Crown className="h-3 w-3" />} label="Gestionnaire" />}
            {!isManager && !isPending && (
              <RoleBadge tone="blue" icon={<Shield className="h-3 w-3" />} label="Équipier" />
            )}
            {isPending && (
              <RoleBadge tone="slate" icon={<Mail className="h-3 w-3" />} label="Invitation en attente" />
            )}
          </div>

          {displayName && row.email ? (
            <p className="truncate text-sm font-normal text-slate-500">{row.email}</p>
          ) : null}

          {!isManager ? (
            <div className="pt-2">
            
              {activePerms.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {activePerms.map((label, index) => (
                    <span
                      key={`${row.id}-${index}-${label}`}
                      className="inline-flex items-center rounded-lg border border-slate-200/80 bg-slate-50/90 px-2.5 py-1 text-[12px] font-normal leading-none text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs font-normal text-slate-400">Aucun droit attribué</span>
              )}
            </div>
          ) : (
            <p className="pt-1 text-xs font-normal text-slate-400">Accès complet à cette entreprise.</p>
          )}
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex w-full shrink-0 flex-wrap items-center justify-stretch gap-2 border-t border-slate-100 pt-4 sm:w-auto sm:justify-end lg:border-t-0 lg:pt-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-xl border-slate-200/90 bg-white px-3 font-normal text-slate-700 shadow-none hover:bg-slate-50"
              onClick={onEdit}
              title={isPending ? "Modifier les droits de l'invitation" : 'Modifier les droits'}
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5 opacity-70" aria-hidden />
              Droits
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-xl border-red-200/80 bg-white px-3 font-normal text-red-600 shadow-none hover:border-red-200 hover:bg-red-50 hover:text-red-700"
              onClick={onRemove}
              title={isPending ? "Annuler l'invitation" : 'Retirer cet équipier'}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5 opacity-70" aria-hidden />
              {isPending ? 'Annuler' : 'Retirer'}
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}

function RoleBadge({
  tone,
  icon,
  label,
}: {
  tone: 'amber' | 'blue' | 'slate';
  icon: ReactNode;
  label: string;
}) {
  const styles = {
    amber: 'border-amber-200/70 bg-amber-50 text-amber-800',
    blue: 'border-blue-200/70 bg-blue-50 text-blue-800',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
  }[tone];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-normal leading-tight shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]',
        styles
      )}
    >
      {icon}
      {label}
    </span>
  );
}
