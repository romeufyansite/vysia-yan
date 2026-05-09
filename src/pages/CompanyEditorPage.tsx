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
import { toast } from 'sonner';
import { Lock } from 'lucide-react';

type Tab = 'info' | 'description' | 'branding' | 'products' | 'invoices' | 'integrations';

const TABS: { id: Tab; label: string; icon: React.ElementType; soon?: boolean }[] = [
  { id: 'info', label: 'Informations', icon: Building2 },
  { id: 'description', label: 'Description', icon: FileText, soon: true },
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
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
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
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
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
    <div className="min-h-screen py-8 px-4 sm:px-6">
      {/* Page header */}
      <div className="mb-8 max-w-6xl mx-auto">
        <button
          onClick={() => (window.location.hash = '/settings/entreprise')}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux entreprises
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{organization.name}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gérez les informations et l'identité visuelle de votre entreprise
        </p>
      </div>

      {/* Mobile nav trigger */}
      <div className="lg:hidden max-w-6xl mx-auto mb-4">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-full flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
        >
          <activeTabMeta.icon className="h-4 w-4 text-blue-600 shrink-0" />
          <span className="flex-1 text-left">{activeTabMeta.label}</span>
          {menuOpen ? (
            <X className="h-4 w-4 text-gray-400" />
          ) : (
            <Menu className="h-4 w-4 text-gray-400" />
          )}
        </button>

        {menuOpen && (
          <div className="mt-1 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden z-20 relative">
            <ul className="p-1.5 space-y-0.5">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <li key={tab.id}>
                    <button
                      onClick={() => handleTabSelect(tab.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                        isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                      <span className="flex-1 text-left">{tab.label}</span>
                      {tab.soon && (
                        <span className="text-[10px] font-medium bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">
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
      <div className="max-w-6xl mx-auto flex gap-6 items-start">
        <aside className="hidden lg:flex flex-col w-56 shrink-0 sticky top-8">
          <nav className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-3 py-3 border-b border-gray-50">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 px-2">
                Paramètres
              </p>
            </div>
            <ul className="p-2 space-y-0.5">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <li key={tab.id}>
                    <button
                      onClick={() => handleTabSelect(tab.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-colors ${
                          isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                        }`}
                      />
                      <span className="flex-1 text-left truncate">{tab.label}</span>
                      {tab.soon && (
                        <span className="text-[10px] font-medium bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">
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
            <ComingSoonPanel
              label="Description"
              icon={FileText}
              description="Rédigez une présentation de votre entreprise. Ces informations seront utilisées par l'IA pour personnaliser vos contenus."
            />
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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
        <Icon className="h-7 w-7 text-gray-300" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{label}</h3>
      <p className="text-sm text-gray-500 max-w-md mx-auto">{description}</p>
      <span className="inline-block mt-5 text-xs font-medium bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full">
        Bientôt disponible
      </span>
    </div>
  );
}
