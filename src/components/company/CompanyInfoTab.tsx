import { useState } from 'react';
import { Building2, Hash, Receipt, MapPin, Mail, Phone, Save, Loader as Loader2, CircleCheck as CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { organizationService, type Organization } from '@/services/organization.service';
import { toast } from 'sonner';

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
    <div className="space-y-8">
      {/* Section Identité */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Identité</h3>
            <p className="text-xs text-gray-500">Comment votre entreprise est identifiée</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldText label="Nom commercial" required value={name} onChange={setName} placeholder="Vysia" />
          <FieldText label="Raison sociale" value={legalName} onChange={setLegalName} placeholder="Vysia SAS" />
          <FieldText label="SIRET / N° d'enregistrement" icon={<Hash className="h-4 w-4 text-gray-400" />} value={registrationNumber} onChange={setRegistrationNumber} placeholder="123 456 789 00010" />
          <FieldText label="Numéro de TVA" icon={<Receipt className="h-4 w-4 text-gray-400" />} value={vatNumber} onChange={setVatNumber} placeholder="FR12345678901" />
        </div>
      </section>

      {/* Section Adresse */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <MapPin className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Adresse de facturation</h3>
            <p className="text-xs text-gray-500">Adresse utilisée pour vos factures</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Mail className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Contact facturation</h3>
            <p className="text-xs text-gray-500">Où envoyer les documents comptables</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldText label="Email" icon={<Mail className="h-4 w-4 text-gray-400" />} type="email" value={billingEmail} onChange={setBillingEmail} placeholder="facturation@entreprise.com" />
          <FieldText label="Téléphone" icon={<Phone className="h-4 w-4 text-gray-400" />} type="tel" value={billingPhone} onChange={setBillingPhone} placeholder="+33 1 23 45 67 89" />
        </div>
      </section>

      {/* Save bar */}
      <div className="flex items-center justify-end gap-3 sticky bottom-4">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium gap-2 min-w-[160px] shadow-lg shadow-blue-600/20"
        >
          {saving ? (<><Loader2 className="h-4 w-4 animate-spin" />Sauvegarde...</>) :
            saved ? (<><CheckCircle2 className="h-4 w-4" />Sauvegardé</>) :
            (<><Save className="h-4 w-4" />Enregistrer</>)}
        </Button>
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
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</div>}
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`h-11 rounded-xl border-gray-200 focus:border-blue-400 focus:ring-blue-100 ${icon ? 'pl-9' : ''}`}
        />
      </div>
    </div>
  );
}
