import { useEffect, useState } from 'react';
import { Loader as Loader2 } from 'lucide-react';
import { organizationService, type Organization } from '@/services/organization.service';
import { CompanyCard } from '@/components/company/CompanyCard';
import { AddCompanyCard } from '@/components/company/AddCompanyCard';
import { DeleteCompanyDialog } from '@/components/company/DeleteCompanyDialog';
import { CreateCompanyDialog } from '@/components/company/CreateCompanyDialog';
import { toast } from 'sonner';

export function CompanyPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Organization | null>(null);

  const loadOrganizations = async () => {
    try {
      const orgs = await organizationService.listMyOrganizations();
      setOrganizations(orgs);
    } catch {
      toast.error('Impossible de charger les entreprises');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, []);

  const openEditor = (id: string) => {
    window.location.hash = `/settings/entreprise/${id}`;
  };

  const handleCreate = async (name: string) => {
    try {
      const org = await organizationService.createOrganization(name);
      toast.success('Entreprise créée');
      await loadOrganizations();
      openEditor(org.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la création');
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await organizationService.deleteOrganization(toDelete.id);
      toast.success('Entreprise supprimée');
      setToDelete(null);
      await loadOrganizations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const canDelete = organizations.length > 1;

  return (
    <div className="h-full">
      <div className="border-b border-slate-200/80 bg-white px-8 py-6">
        <h1 className="text-2xl font-medium tracking-tight text-slate-900">Entreprises</h1>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {organizations.map((org) => (
            <CompanyCard
              key={org.id}
              organization={org}
              canDelete={canDelete}
              onClick={() => openEditor(org.id)}
              onEdit={() => openEditor(org.id)}
              onDelete={() => setToDelete(org)}
            />
          ))}
          <AddCompanyCard onClick={() => setCreateOpen(true)} />
        </div>
      </div>

      <CreateCompanyDialog open={createOpen} onOpenChange={setCreateOpen} onCreate={handleCreate} />

      <DeleteCompanyDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        companyName={toDelete?.name || ''}
        onConfirm={handleDelete}
      />
    </div>
  );
}
