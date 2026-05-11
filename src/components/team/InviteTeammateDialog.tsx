import { useEffect, useMemo, useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Loader as Loader2, Building2 } from 'lucide-react';
import { PermissionsEditor } from './PermissionsEditor';
import { DEFAULT_PERMISSIONS, type PermissionMap } from '@/lib/permissions';
import type { Organization } from '@/services/organization.service';

interface InviteTeammateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  managerOrgs: Organization[];
  defaultOrgId: string | null;
  onInvite: (data: {
    email: string;
    firstName: string;
    lastName: string;
    orgPermissions: Record<string, PermissionMap>;
  }) => Promise<void>;
}

export function InviteTeammateDialog({
  open,
  onOpenChange,
  managerOrgs,
  defaultOrgId,
  onInvite,
}: InviteTeammateDialogProps) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedOrgs, setSelectedOrgs] = useState<Set<string>>(new Set());
  const [permsByOrg, setPermsByOrg] = useState<Record<string, PermissionMap>>({});
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const initial = new Set<string>();
    if (defaultOrgId) initial.add(defaultOrgId);
    setSelectedOrgs(initial);
    setPermsByOrg(defaultOrgId ? { [defaultOrgId]: DEFAULT_PERMISSIONS } : {});
    setActiveTab(defaultOrgId ?? managerOrgs[0]?.id ?? null);
    setEmail('');
    setFirstName('');
    setLastName('');
  }, [open, defaultOrgId, managerOrgs]);

  const toggleOrg = (orgId: string, checked: boolean) => {
    const next = new Set(selectedOrgs);
    const nextPerms = { ...permsByOrg };
    if (checked) {
      next.add(orgId);
      if (!nextPerms[orgId]) nextPerms[orgId] = DEFAULT_PERMISSIONS;
      setActiveTab(orgId);
    } else {
      next.delete(orgId);
      delete nextPerms[orgId];
      if (activeTab === orgId) setActiveTab(Array.from(next)[0] ?? null);
    }
    setSelectedOrgs(next);
    setPermsByOrg(nextPerms);
  };

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && selectedOrgs.size > 0 && firstName.trim().length > 0;
  }, [email, selectedOrgs, firstName]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const orgPermissions: Record<string, PermissionMap> = {};
      for (const orgId of selectedOrgs) {
        orgPermissions[orgId] = permsByOrg[orgId] ?? {};
      }
      await onInvite({
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        orgPermissions,
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Inviter un équipier</DialogTitle>
          <DialogDescription>
            Renseignez les informations de l'équipier, sélectionnez les entreprises auxquelles il aura accès, puis définissez ses droits par entreprise.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="invite-first">Prénom</Label>
              <Input
                id="invite-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Prénom"
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-last">Nom</Label>
              <Input
                id="invite-last"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Nom"
                className="rounded-xl h-11"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-email">Adresse e-mail</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom.nom@entreprise.com"
              className="rounded-xl h-11"
            />
          </div>

          <div className="space-y-2">
            <Label>Entreprises</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {managerOrgs.map((org) => (
                <label
                  key={org.id}
                  className={`flex items-center gap-3 px-3 py-2.5 border rounded-xl cursor-pointer transition ${
                    selectedOrgs.has(org.id)
                      ? 'border-blue-500 bg-blue-50/50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Checkbox
                    checked={selectedOrgs.has(org.id)}
                    onCheckedChange={(c) => toggleOrg(org.id, !!c)}
                  />
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="truncate text-sm font-medium text-slate-900">{org.name}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {selectedOrgs.size > 0 && (
            <div className="space-y-3">
              <Label>Droits par entreprise</Label>
              {selectedOrgs.size > 1 && (
                <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
                  {Array.from(selectedOrgs).map((orgId) => {
                    const org = managerOrgs.find((o) => o.id === orgId);
                    const active = activeTab === orgId;
                    return (
                      <button
                        key={orgId}
                        type="button"
                        onClick={() => setActiveTab(orgId)}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg transition ${
                          active ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {org?.name ?? orgId}
                      </button>
                    );
                  })}
                </div>
              )}
              {activeTab && selectedOrgs.has(activeTab) && (
                <PermissionsEditor
                  value={permsByOrg[activeTab] ?? {}}
                  onChange={(p) => setPermsByOrg({ ...permsByOrg, [activeTab]: p })}
                />
              )}
              <p className="text-xs text-slate-500">« Gérer » inclut automatiquement « Voir ».</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className="rounded-xl bg-blue-600 hover:bg-blue-700"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Envoyer l'invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
