import { useState, useEffect } from 'react';
import {
  Building2,
  Palette,
  FileText,
  ShoppingBag,
  Receipt,
  Plug,
  Loader as Loader2,
  Menu,
  X,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { organizationService, type Organization } from '@/services/organization.service';
import { CompanyInfoTab } from '@/components/company/CompanyInfoTab';
import { CompanyBrandingTab } from '@/components/company/CompanyBrandingTab';
import { CompanyDescriptionTab } from '@/components/company/CompanyDescriptionTab';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';

type Tab = 'info' | 'description' | 'branding' | 'products' | 'invoices' | 'integrations';

const TABS: { id: Tab; label: string; icon: React.ElementType; soon?: boolean }[] = [
  { id: 'info', label: 'Informations', icon: Building2 },
  { id: 'description', label: 'Description', icon: FileText },
  { id: 'branding', label: 'Image de marque', icon: Palette },
  { id: 'products', label: 'Produits & Services', icon: ShoppingBag, soon: true },
  { id: 'invoices', label: 'Factures', icon: Receipt, soon: true },
  { id: 'integrations', label: 'Intégrations', icon: Plug, soon: true },
];

interface CompanyEditorPageProps {
  orgId: string;
}

export function CompanyEditorPage({ orgId }: CompanyEditorPageProps) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [menuOpen, setMenuOpen] = useState(false);
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [org, allowed] = await Promise.all([
          organizationService.getById(orgId),
          organizationService.canManageOrg(orgId),
        ]);
        setOrganization(org);
        setCanManage(allowed);
      } catch {
        toast.error("Impossible de charger l'entreprise");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [orgId]);

  const handleTabSelect = (id: Tab) => {
    setActiveTab(id);
    setMenuOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="py-10 px-4 sm:px-6 max-w-3xl mx-auto">
        <div className="rounded-2xl border border-slate-200/70 bg-white p-10 text-center shadow-[0_1px_3px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.02]">
          <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Entreprise introuvable</p>
        </div>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="py-10 px-4 sm:px-6 max-w-3xl mx-auto">
        <button
          onClick={() => (window.location.hash = '/settings/entreprise')}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux entreprises
        </button>
        <div className="rounded-2xl border border-slate-200/70 bg-white p-10 text-center shadow-[0_1px_3px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.02]">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
            <Lock className="h-6 w-6 text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Accès restreint</h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Vous ne possédez pas les droits pour modifier l'entreprise « {organization.name} ».
            Contactez un gestionnaire pour obtenir l'accès.
          </p>
        </div>
      </div>
    );
  }

  const activeTabMeta = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50/95 to-white py-8 px-4 sm:px-6">
      {/* Page header */}
      <div className="mb-8 max-w-6xl mx-auto">
        <button
          onClick={() => (window.location.hash = '/settings/entreprise')}
          className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm text-slate-500 transition-colors hover:bg-white/80 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux entreprises
        </button>
        <h1 className="text-[1.625rem] font-medium tracking-tight text-slate-900 sm:text-3xl">{organization.name}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 sm:text-[15px]">
          Gérez les informations et l&apos;identité visuelle de votre entreprise
        </p>
      </div>

      {/* Mobile nav trigger */}
      <div className="lg:hidden max-w-6xl mx-auto mb-4">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex w-full items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 text-sm font-medium text-slate-700 shadow-[0_1px_3px_rgba(15,23,42,0.05)] transition-colors hover:border-slate-300 hover:bg-white"
        >
          <activeTabMeta.icon className="h-4 w-4 text-blue-600 shrink-0" />
          <span className="flex-1 text-left">{activeTabMeta.label}</span>
          {menuOpen ? (
            <X className="h-4 w-4 text-slate-400" />
          ) : (
            <Menu className="h-4 w-4 text-slate-400" />
          )}
        </button>

        {menuOpen && (
          <div className="relative z-20 mt-1 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-lg shadow-slate-900/10">
            <ul className="space-y-0.5 p-2">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <li key={tab.id}>
                    <button
                      onClick={() => handleTabSelect(tab.id)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all ${
                        isActive ? 'bg-blue-50 font-semibold text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span className="flex-1 text-left">{tab.label}</span>
                      {tab.soon && (
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Bientôt
                        </span>
                      )}
                      {isActive && <ChevronRight className="h-3.5 w-3.5 text-blue-500" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Desktop layout */}
      <div className="mx-auto flex max-w-6xl items-start gap-8">
        <aside className="sticky top-8 hidden w-[15.5rem] shrink-0 lg:flex lg:flex-col">
          <nav className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.02]">
            <div className="border-b border-slate-100 px-4 py-4">
              <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Paramètres</p>
            </div>
            <ul className="space-y-1 p-3">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <li key={tab.id}>
                    <button
                      onClick={() => handleTabSelect(tab.id)}
                      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all ${
                        isActive ? 'bg-blue-50 font-semibold text-blue-700 shadow-inner shadow-blue-900/5' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-colors ${
                          isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                        }`}
                      />
                      <span className="flex-1 text-left truncate">{tab.label}</span>
                      {tab.soon && (
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Bientôt
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <div className="w-full lg:flex-1 min-w-0">
          {activeTab === 'info' && (
            <CompanyInfoTab organization={organization} onUpdate={setOrganization} />
          )}
          {activeTab === 'description' && (
            <CompanyDescriptionTab organization={organization} onUpdate={setOrganization} />
          )}
          {activeTab === 'branding' && (
            <CompanyBrandingTab organization={organization} onUpdate={setOrganization} />
          )}
          {activeTab === 'products' && (
            <ComingSoonPanel
              label="Produits & Services"
              icon={ShoppingBag}
              description="Renseignez votre catalogue pour que l'IA puisse créer des contenus adaptés à vos offres."
            />
          )}
          {activeTab === 'invoices' && (
            <ComingSoonPanel
              label="Factures"
              icon={Receipt}
              description="Retrouvez ici l'historique de vos factures et documents comptables."
            />
          )}
          {activeTab === 'integrations' && (
            <ComingSoonPanel
              label="Intégrations"
              icon={Plug}
              description="Connectez vos outils externes (CRM, e-commerce, réseaux sociaux...) pour enrichir vos contenus."
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface ComingSoonPanelProps {
  label: string;
  icon: React.ElementType;
  description: string;
}

function ComingSoonPanel({ label, icon: Icon, description }: ComingSoonPanelProps) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-12 text-center shadow-[0_1px_3px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.02]">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50">
        <Icon className="h-7 w-7 text-slate-300" />
      </div>
      <h3 className="mb-2 text-lg font-semibold tracking-tight text-slate-900">{label}</h3>
      <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-500">{description}</p>
      <span className="mt-6 inline-block rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600">
        Bientôt disponible
      </span>
    </div>
  );
}
