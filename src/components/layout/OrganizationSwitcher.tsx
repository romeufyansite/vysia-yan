import { useEffect, useState } from 'react';
import { Building2, Check, ChevronsUpDown, Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { organizationService, type Organization } from '@/services/organization.service';
import { toast } from 'sonner';

interface OrganizationSwitcherProps {
  collapsed?: boolean;
}

export function OrganizationSwitcher({ collapsed = false }: OrganizationSwitcherProps) {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [list, current] = await Promise.all([
          organizationService.listMyOrganizations(),
          organizationService.getCurrentOrganization(),
        ]);
        setOrgs(list);

        let activeId = current?.id ?? null;

        if (list.length > 0 && (!activeId || !list.some((o) => o.id === activeId))) {
          activeId = list[0].id;
          try {
            await organizationService.switchCurrentOrganization(activeId);
          } catch {
            /* ignore */
          }
        }
        setCurrentId(activeId);
      } catch {
        toast.error('Erreur lors du chargement des entreprises');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activeOrg = orgs.find((o) => o.id === currentId) ?? null;

  const handleSelect = async (orgId: string) => {
    if (orgId === currentId) return;
    try {
      await organizationService.switchCurrentOrganization(orgId);
      setCurrentId(orgId);
      toast.success('Entreprise changée');
      window.location.reload();
    } catch {
      toast.error("Impossible de changer d'entreprise");
    }
  };

  const handleAdd = () => {
    window.location.hash = '/settings/entreprise';
  };

  if (loading) {
    return (
      <div
        className={`${collapsed ? 'h-11 w-11 mx-auto' : 'h-12 w-full'} animate-pulse rounded-xl bg-slate-100`}
      />
    );
  }

  const initial = activeOrg?.name?.[0]?.toUpperCase() || 'E';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex w-full items-center gap-2 rounded-xl border border-slate-200/80 bg-white transition-colors hover:border-slate-300 hover:bg-slate-50 ${
            collapsed ? 'h-11 w-11 justify-center p-0 mx-auto' : 'h-12 px-3'
          }`}
          title={collapsed ? activeOrg?.name : undefined}
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-xs shrink-0 overflow-hidden">
            {activeOrg?.logo_url ? (
              <img src={activeOrg.logo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              initial
            )}
          </div>
          {!collapsed && (
            <>
              <span className="flex-1 truncate text-left text-sm font-semibold text-slate-900">
                {activeOrg?.name || 'Aucune entreprise'}
              </span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-56 rounded-xl p-1"
        sideOffset={6}
      >
        <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          Entreprises
        </div>
        {orgs.length === 0 && (
          <div className="px-2 py-2 text-xs text-slate-500">Aucune entreprise</div>
        )}
        {orgs.map((org) => {
          const isActive = org.id === currentId;
          return (
            <DropdownMenuItem
              key={org.id}
              onClick={() => handleSelect(org.id)}
              className="rounded-lg flex items-center gap-2 cursor-pointer"
            >
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-[10px] font-semibold shrink-0 overflow-hidden">
                {org.logo_url ? (
                  <img src={org.logo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  org.name[0]?.toUpperCase() || <Building2 className="h-3 w-3" />
                )}
              </div>
              <span className="flex-1 text-sm truncate">{org.name}</span>
              {isActive && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleAdd}
          className="rounded-lg flex items-center gap-2 cursor-pointer text-blue-600 focus:text-blue-700"
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm font-medium">Ajouter une entreprise</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
