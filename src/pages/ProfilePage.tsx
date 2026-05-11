import { useState, useEffect } from 'react';
import { User, Mail, Phone, Save, Loader as Loader2, CircleCheck as CheckCircle2, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { profileService, type Profile } from '@/services/profile.service';
import { toast } from 'sonner';

export function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [emailChanged, setEmailChanged] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const data = await profileService.getProfile(user.id);
        setProfile(data);
        setFirstName(data?.first_name || '');
        setLastName(data?.last_name || '');
        setPhone(data?.phone || '');
        setEmail(user.email || '');
      } catch {
        toast.error('Impossible de charger le profil');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const handleEmailChange = (val: string) => {
    setEmail(val);
    setEmailChanged(val !== (user?.email || ''));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaved(false);
    try {
      await profileService.updateProfile(user.id, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || null,
      });

      if (emailChanged && email.trim() && email.trim() !== user.email) {
        await profileService.updateEmail(email.trim());
        toast.success('Un email de confirmation a été envoyé à votre nouvelle adresse');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      toast.success('Profil mis à jour');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const getPasswordError = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      return '';
    }
    if (newPassword.length < 8) {
      return 'Le nouveau mot de passe doit contenir au moins 8 caractères';
    }
    if (newPassword !== confirmPassword) {
      return 'La confirmation ne correspond pas au nouveau mot de passe';
    }
    if (currentPassword === newPassword) {
      return 'Le nouveau mot de passe doit être différent de l’ancien';
    }
    return null;
  };

  const getPasswordStrength = (password: string) => {
    if (!password) {
      return {
        score: 0,
        label: 'Aucun mot de passe',
        color: 'bg-gray-200',
        textColor: 'text-gray-400',
      };
    }

    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 2) {
      return {
        score,
        label: 'Faible',
        color: 'bg-red-500',
        textColor: 'text-red-600',
      };
    }

    if (score <= 3) {
      return {
        score,
        label: 'Moyen',
        color: 'bg-amber-500',
        textColor: 'text-amber-600',
      };
    }

    return {
      score,
      label: 'Fort',
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600',
    };
  };

  const passwordError = getPasswordError();
  const passwordStrength = getPasswordStrength(newPassword);
  const isPasswordStrongEnough = !newPassword || passwordStrength.score >= 3;
  const canSubmitPassword = !passwordSaving && !passwordError && isPasswordStrongEnough;

  const handlePasswordSave = async () => {
    if (!user) return;
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    setPasswordSaving(true);
    try {
      await profileService.updatePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      toast.success('Mot de passe mis à jour');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour du mot de passe');
    } finally {
      setPasswordSaving(false);
    }
  };

  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-full max-w-2xl px-6 py-12">
      <div className="mb-10">
        <h1 className="text-[1.625rem] font-semibold tracking-tight text-slate-900 sm:text-3xl">Profil</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-500">Gérez vos informations personnelles</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.02]">
        {/* Avatar header */}
        <div className="flex items-center gap-5 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-slate-100/80 px-8 py-9">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold shadow-md select-none">
            {initials}
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-900">
              {firstName || lastName ? `${firstName} ${lastName}`.trim() : 'Votre nom'}
            </p>
            <p className="text-sm text-slate-500">{user?.email}</p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-7 px-8 py-9">
          {/* Name row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2.5">
              <Label htmlFor="firstName">
                Prénom
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Votre prénom"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="lastName">
                Nom
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Votre nom"
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2.5">
            <Label htmlFor="email">
              Adresse email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="votre@email.com"
                className="pl-9"
              />
            </div>
            {emailChanged && (
              <p className="text-xs text-amber-600">Un email de confirmation sera envoyé à cette adresse</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Label htmlFor="phone">
                Numéro de téléphone
              </Label>
              <span className="text-xs font-normal text-slate-400">(facultatif)</span>
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+33 6 00 00 00 00"
                className="pl-9"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100" />

          {/* Save button */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              {profile?.updated_at
                ? `Dernière mise à jour : ${new Date(profile.updated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
                : ''}
            </p>
            <Button onClick={handleSave} disabled={saving} className="min-w-[140px] gap-2 rounded-xl px-6 shadow-md shadow-primary/15">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sauvegarde...
                </>
              ) : saved ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Sauvegardé
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Enregistrer
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.02]">
        <div className="border-b border-slate-100 bg-gradient-to-br from-slate-50 to-slate-100/80 px-8 py-7">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">Sécurité du compte</h2>
          <p className="mt-1 text-sm text-slate-500">Modifiez votre mot de passe en toute sécurité</p>
        </div>

        <div className="space-y-6 px-8 py-9">
          <div className="space-y-2.5">
            <Label htmlFor="currentPassword">
              Mot de passe actuel
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="pl-9 pr-11"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                aria-label={showCurrentPassword ? 'Masquer le mot de passe actuel' : 'Afficher le mot de passe actuel'}
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2.5">
              <Label htmlFor="newPassword">
                Nouveau mot de passe
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 caractères"
                  autoComplete="new-password"
                  className="pl-9 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                  aria-label={showNewPassword ? 'Masquer le nouveau mot de passe' : 'Afficher le nouveau mot de passe'}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Robustesse</span>
                  <span className={`text-xs font-medium ${passwordStrength.textColor}`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {Array.from({ length: 4 }).map((_, idx) => {
                    const active = newPassword.length > 0 && idx < Math.min(4, Math.max(1, passwordStrength.score - 1));
                    return (
                      <div
                        key={idx}
                        className={`h-1.5 rounded-full transition-colors ${
                          active ? passwordStrength.color : 'bg-slate-200'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="confirmPassword">
                Confirmer le nouveau mot de passe
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Retapez le nouveau mot de passe"
                  autoComplete="new-password"
                  className="pl-9 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                  aria-label={showConfirmPassword ? 'Masquer la confirmation du mot de passe' : 'Afficher la confirmation du mot de passe'}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-7 sm:flex-row sm:items-center sm:justify-between">
            <p className={`text-xs ${passwordError ? 'text-amber-600' : 'text-slate-400'}`}>
              {passwordError || (!isPasswordStrongEnough ? 'Choisissez un mot de passe au moins de niveau moyen' : 'Utilisez au moins 8 caractères avec une combinaison robuste')}
            </p>
            <Button
              onClick={handlePasswordSave}
              disabled={!canSubmitPassword}
              className="min-w-[220px] gap-2 rounded-xl px-6 shadow-md shadow-primary/15"
            >
              {passwordSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Mise à jour...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Modifier le mot de passe
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
