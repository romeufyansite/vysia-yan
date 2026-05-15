import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  Hash,
  Receipt,
  MapPin,
  Mail,
  Phone,
  Save,
  Loader as Loader2,
  CircleCheck as CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { organizationService, type Organization } from '@/services/organization.service';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CompanyInfoTabProps {
  organization: Organization;
  onUpdate: (org: Organization) => void;
}

export function CompanyInfoTab({ organization, onUpdate }: CompanyInfoTabProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState(organization.name || '');
  const [legalName, setLegalName] = useState(organization.legal_name || '');
  const [registrationNumber, setRegistrationNumber] = useState(organization.registration_number || '');
  const [vatNumber, setVatNumber] = useState(organization.vat_number || '');
  const [addressLine1, setAddressLine1] = useState(organization.address_line1 || '');
  const [addressLine2, setAddressLine2] = useState(organization.address_line2 || '');
  const [postalCode, setPostalCode] = useState(organization.postal_code || '');
  const [city, setCity] = useState(organization.city || '');
  const [country, setCountry] = useState(organization.country || '');
  const [billingEmail, setBillingEmail] = useState(organization.billing_email || '');
  const [billingPhone, setBillingPhone] = useState(organization.billing_phone || '');

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Le nom de l\'entreprise est obligatoire');
      return;
    }
    setSaving(true);
    setSaved(false);
    try {
      const updated = await organizationService.updateOrganization(organization.id, {
        name: name.trim(),
        legal_name: legalName.trim() || null,
        registration_number: registrationNumber.trim() || null,
        vat_number: vatNumber.trim() || null,
        address_line1: addressLine1.trim() || null,
        address_line2: addressLine2.trim() || null,
        postal_code: postalCode.trim() || null,
        city: city.trim() || null,
        country: country.trim() || null,
        billing_email: billingEmail.trim() || null,
        billing_phone: billingPhone.trim() || null,
      });
      onUpdate(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      toast.success('Informations enregistrées');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-28">
      {/* Section Identité */}
      <section className="rounded-2xl border border-slate-200/70 bg-white p-7 shadow-[0_1px_3px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.02] sm:p-9">
        <SectionHeader
          icon={Building2}
          title="Identité"
          subtitle="Comment votre entreprise est identifiée"
        />
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-6">
          <FieldText label="Nom commercial" required value={name} onChange={setName} placeholder="Vysia" />
          <FieldText label="Raison sociale" value={legalName} onChange={setLegalName} placeholder="Vysia SAS" />
          <FieldText label="SIRET / N° d'enregistrement" icon={<Hash className="h-[1.125rem] w-[1.125rem] text-slate-400" />} value={registrationNumber} onChange={setRegistrationNumber} placeholder="123 456 789 00010" />
          <FieldText label="Numéro de TVA" icon={<Receipt className="h-[1.125rem] w-[1.125rem] text-slate-400" />} value={vatNumber} onChange={setVatNumber} placeholder="FR12345678901" />
        </div>
      </section>

      {/* Section Adresse */}
      <section className="rounded-2xl border border-slate-200/70 bg-white p-7 shadow-[0_1px_3px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.02] sm:p-9">
        <SectionHeader
          icon={MapPin}
          title="Adresse de facturation"
          subtitle="Adresse utilisée pour vos factures"
        />
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-6">
          <div className="sm:col-span-2">
            <FieldText label="Adresse" value={addressLine1} onChange={setAddressLine1} placeholder="1 rue de la République" />
          </div>
          <div className="sm:col-span-2">
            <FieldText label="Complément" value={addressLine2} onChange={setAddressLine2} placeholder="Bâtiment A, étage 2" />
          </div>
          <FieldText label="Code postal" value={postalCode} onChange={setPostalCode} placeholder="75001" />
          <FieldText label="Ville" value={city} onChange={setCity} placeholder="Paris" />
          <div className="sm:col-span-2">
            <FieldText label="Pays" value={country} onChange={setCountry} placeholder="France" />
          </div>
        </div>
      </section>

      {/* Section Contact facturation */}
      <section className="rounded-2xl border border-slate-200/70 bg-white p-7 shadow-[0_1px_3px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.02] sm:p-9">
        <SectionHeader
          icon={Mail}
          title="Contact facturation"
          subtitle="Où envoyer les documents comptables"
        />
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-6">
          <FieldText label="Email" icon={<Mail className="h-[1.125rem] w-[1.125rem] text-slate-400" />} type="email" value={billingEmail} onChange={setBillingEmail} placeholder="facturation@entreprise.com" />
          <FieldText label="Téléphone" icon={<Phone className="h-[1.125rem] w-[1.125rem] text-slate-400" />} type="tel" value={billingPhone} onChange={setBillingPhone} placeholder="+33 1 23 45 67 89" />
        </div>
      </section>

      {/* Save bar — sticky, readable on long forms */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/85 px-4 py-4 backdrop-blur-md supports-[backdrop-filter]:bg-white/70 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="h-12 min-w-[11rem] gap-2 rounded-xl bg-blue-600 px-7 text-base font-medium text-white shadow-md shadow-blue-600/15 transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                Sauvegarde…
              </>
            ) : saved ? (
              <>
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Sauvegardé
              </>
            ) : (
              <>
                <Save className="h-4 w-4 shrink-0" />
                Enregistrer
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}

function SectionHeader({ icon: Icon, title, subtitle }: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-center sm:gap-5">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600/12 to-blue-600/6 text-blue-600 ring-1 ring-blue-600/10">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <div className="min-w-0">
        <h3 className="text-lg font-medium tracking-tight text-slate-900">{title}</h3>
        <p className="mt-0.5 text-sm leading-relaxed text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

interface FieldTextProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  icon?: React.ReactNode;
}

function FieldText({ label, value, onChange, placeholder, type = 'text', required, icon }: FieldTextProps) {
  return (
    <div className="space-y-2.5">
      <Label className="text-sm font-medium leading-none text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </Label>
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute left-4 top-1/2 flex h-[1.125rem] w-[1.125rem] -translate-y-1/2 items-center justify-center">
            {icon}
          </div>
        )}
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(icon && 'pl-12')}
        />
      </div>
    </div>
  );
}
