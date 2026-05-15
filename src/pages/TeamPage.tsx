import { useEffect, useState } from 'react';
import { Loader as Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { teamService, type TeamRow } from '@/services/team.service';
import { supabase } from '@/lib/supabase';
import { organizationService, type Organization } from '@/services/organization.service';
import { InviteTeammateDialog } from '@/components/team/InviteTeammateDialog';
import { EditMemberDialog } from '@/components/team/EditMemberDialog';
import { TeamMembersSection } from '@/components/team/TeamMembersSection';
import { useMembership } from '@/contexts/MembershipContext';
import type { PermissionMap } from '@/lib/permissions';
import { toast } from 'sonner';

export function TeamPage() {
  const { membership } = useMembership();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [rows, setRows] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editRow, setEditRow] = useState<TeamRow | null>(null);
  const [toRemove, setToRemove] = useState<TeamRow | null>(null);

  const isManager = membership?.role === 'manager';
  const managerOrgs = orgs.filter((o) => !!o);

  useEffect(() => {
    (async () => {
      const [current, all] = await Promise.all([
        organizationService.getCurrentOrganization(),
        organizationService.listMyOrganizations(),
      ]);
      setOrgId(current?.id ?? null);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: mgrRows } = await supabase
          .from('org_memberships')
          .select('org_id')
          .eq('user_id', user.id)
          .eq('role', 'manager');
        const mgrIds = new Set((mgrRows ?? []).map((r: { org_id: string }) => r.org_id));
        setOrgs(all.filter((o) => mgrIds.has(o.id)));
      } else {
        setOrgs([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (orgId) load(orgId);
  }, [orgId]);

  const load = async (id: string) => {
    setLoading(true);
    try {
      setRows(await teamService.listTeam(id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (data: {
    email: string;
    firstName: string;
    lastName: string;
    orgPermissions: Record<string, PermissionMap>;
  }) => {
    try {
      await teamService.sendInvitation(data);
      toast.success('Invitation envoyée');
      if (orgId) load(orgId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'envoi");
    }
  };

  const handleUpdatePermissions = async (permissions: PermissionMap) => {
    if (!editRow) return;
    try {
      if (editRow.kind === 'member') {
        await teamService.updateMembershipPermissions(editRow.id, permissions);
      } else {
        await teamService.updateInvitationPermissions(editRow.id, permissions);
      }
      toast.success('Droits mis à jour');
      if (orgId) load(orgId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur de mise à jour');
    }
  };

  const handleRemove = async () => {
    if (!toRemove) return;
    try {
      if (toRemove.kind === 'member') {
        await teamService.removeMember(toRemove.id);
        toast.success('Équipier retiré');
      } else {
        await teamService.revokeInvitation(toRemove.id);
        toast.success('Invitation annulée');
      }
      setToRemove(null);
      if (orgId) load(orgId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-full px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[1.625rem] font-medium tracking-tight text-slate-900 sm:text-3xl">Équipe</h1>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-slate-500">
              Invitez des équipiers et définissez leurs droits sur vos entreprises.
            </p>
          </div>
          {isManager && (
            <Button onClick={() => setInviteOpen(true)} size="lg" className="gap-2 rounded-xl shadow-md shadow-primary/15">
              <UserPlus className="h-4 w-4" />
              Inviter un équipier
            </Button>
          )}
        </div>

        {!isManager && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
            Seul le gestionnaire de l'entreprise peut inviter ou gérer les équipiers.
          </div>
        )}

        <TeamMembersSection
          rows={rows}
          canInviteOrManage={!!isManager}
          onEdit={setEditRow}
          onRemove={setToRemove}
        />
      </div>

      <InviteTeammateDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        managerOrgs={managerOrgs}
        defaultOrgId={orgId}
        onInvite={handleInvite}
      />

      {editRow && (
        <EditMemberDialog
          open={!!editRow}
          onOpenChange={(o) => !o && setEditRow(null)}
          displayName={
            [editRow.first_name, editRow.last_name].filter(Boolean).join(' ').trim() ||
            editRow.email ||
            ''
          }
          email={editRow.email ?? ''}
          isPending={editRow.kind === 'invitation'}
          initialPermissions={editRow.permissions}
          onSave={handleUpdatePermissions}
        />
      )}

      <AlertDialog open={!!toRemove} onOpenChange={(o) => !o && setToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toRemove?.kind === 'invitation' ? 'Annuler cette invitation ?' : 'Retirer cet équipier ?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toRemove?.kind === 'invitation'
                ? `L'invitation envoyée à ${toRemove?.email} sera annulée.`
                : `${toRemove?.email} n'aura plus accès à cette entreprise.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} className="bg-red-600 hover:bg-red-700">
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
