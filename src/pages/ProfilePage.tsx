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
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Profil</h1>
        <p className="text-sm text-gray-500 mt-1">Gérez vos informations personnelles</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Avatar header */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 px-8 py-8 flex items-center gap-5 border-b border-gray-100">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold shadow-md select-none">
            {initials}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-lg">
              {firstName || lastName ? `${firstName} ${lastName}`.trim() : 'Votre nom'}
            </p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>

        {/* Form */}
        <div className="px-8 py-8 space-y-6">
          {/* Name row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                Prénom
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Votre prénom"
                  className="pl-9 h-11 rounded-xl border-gray-200 focus:border-blue-400 focus:ring-blue-100"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                Nom
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Votre nom"
                  className="pl-9 h-11 rounded-xl border-gray-200 focus:border-blue-400 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Adresse email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="votre@email.com"
                className="pl-9 h-11 rounded-xl border-gray-200 focus:border-blue-400 focus:ring-blue-100"
              />
            </div>
            {emailChanged && (
              <p className="text-xs text-amber-600">Un email de confirmation sera envoyé à cette adresse</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                Numéro de téléphone
              </Label>
              <span className="text-xs text-gray-400 font-normal">(facultatif)</span>
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+33 6 00 00 00 00"
                className="pl-9 h-11 rounded-xl border-gray-200 focus:border-blue-400 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Save button */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {profile?.updated_at
                ? `Dernière mise à jour : ${new Date(profile.updated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
                : ''}
            </p>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium gap-2 min-w-[140px]"
            >
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

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-6">
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 px-8 py-6 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-lg">Sécurité du compte</h2>
          <p className="text-sm text-gray-500 mt-1">Modifiez votre mot de passe en toute sécurité</p>
        </div>

        <div className="px-8 py-8 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="currentPassword" className="text-sm font-medium text-gray-700">
              Mot de passe actuel
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="pl-9 pr-11 h-11 rounded-xl border-gray-200 focus:border-blue-400 focus:ring-blue-100"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={showCurrentPassword ? 'Masquer le mot de passe actuel' : 'Afficher le mot de passe actuel'}
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
                Nouveau mot de passe
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 caractères"
                  autoComplete="new-password"
                  className="pl-9 pr-11 h-11 rounded-xl border-gray-200 focus:border-blue-400 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showNewPassword ? 'Masquer le nouveau mot de passe' : 'Afficher le nouveau mot de passe'}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Robustesse</span>
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
                          active ? passwordStrength.color : 'bg-gray-200'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                Confirmer le nouveau mot de passe
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Retapez le nouveau mot de passe"
                  autoComplete="new-password"
                  className="pl-9 pr-11 h-11 rounded-xl border-gray-200 focus:border-blue-400 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showConfirmPassword ? 'Masquer la confirmation du mot de passe' : 'Afficher la confirmation du mot de passe'}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <p className={`text-xs ${passwordError ? 'text-amber-600' : 'text-gray-400'}`}>
              {passwordError || (!isPasswordStrongEnough ? 'Choisissez un mot de passe au moins de niveau moyen' : 'Utilisez au moins 8 caractères avec une combinaison robuste')}
            </p>
            <Button
              onClick={handlePasswordSave}
              disabled={!canSubmitPassword}
              className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium gap-2 min-w-[220px]"
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
