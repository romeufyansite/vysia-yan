import { useEffect, useRef, useState } from 'react';
import { Building2, CircleCheck as CheckCircle, Eye, EyeOff, Loader as Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { teamService } from '@/services/team.service';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

type Mode = 'signup' | 'signin';

interface InvitePreview {
  email: string;
  org_name: string;
  org_names: string[];
  inviter_email: string | null;
  status: string;
  expires_at: string;
}

export function InvitationPage() {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('signup');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const acceptCalled = useRef(false);

  // Extract token from URL (query string takes priority over hash)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const t = searchParams.get('invitation_token') || hashParams.get('token');
    setToken(t ?? null);
  }, []);

  // Load preview once we have the token
  useEffect(() => {
    if (token === null) return; // still resolving
    if (token === '') {
      setError("Lien d'invitation invalide — token manquant.");
      setPageLoading(false);
      return;
    }
    (async () => {
      try {
        const data = await teamService.getInvitationPreview(token);
        if (!data) {
          setError('Invitation introuvable ou expirée.');
        } else if (data.status === 'accepted') {
          setError("Cette invitation a déjà été acceptée.");
        } else if (data.status !== 'pending') {
          setError(`Cette invitation n'est plus valide (${data.status}).`);
        } else if (new Date(data.expires_at) < new Date()) {
          setError("Cette invitation a expiré.");
        } else {
          setPreview(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de chargement');
      } finally {
        setPageLoading(false);
      }
    })();
  }, [token]);

  // If the user arrives already authenticated (Supabase invite link auto-logs them in)
  // AND their email matches the invitation, attempt accept automatically after preview loads.
  useEffect(() => {
    if (!user || !preview || !token || acceptCalled.current) return;
    if (user.email?.toLowerCase() !== preview.email.toLowerCase()) return;
    // User arrived via the email link with a session already set; they need to
    // set a password before we finalise. We don't auto-accept yet — we wait for
    // the password step so they can always log back in.
  }, [user, preview, token]);

  const doAccept = async (newPassword?: string) => {
    if (!token || acceptCalled.current) return;
    acceptCalled.current = true;
    setSubmitting(true);
    try {
      if (newPassword && newPassword.length >= 6) {
        const { error: pwErr } = await supabase.auth.updateUser({ password: newPassword });
        if (pwErr) throw pwErr;
      }
      await teamService.acceptInvitation(token);
      setAccepted(true);
      toast.success('Bienvenue ! Invitation acceptée.');
      setTimeout(() => {
        // Clean URL and navigate to app
        window.history.replaceState({}, '', window.location.pathname);
        window.location.hash = '/screens';
        window.location.reload();
      }, 1200);
    } catch (err) {
      acceptCalled.current = false;
      const msg = err instanceof Error ? err.message : 'Erreur';
      toast.error(msg);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAuthAndAccept = async () => {
    if (!preview || !token) return;
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: preview.email,
          password,
          options: { data: { invitation_token: token } },
        });
        if (error) throw error;
        if (!data.session) {
          toast.info('Un e-mail de confirmation vous a été envoyé. Confirmez-le puis revenez sur ce lien.');
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: preview.email, password });
        if (error) throw error;
      }
      await doAccept();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const orgLabel = preview?.org_names?.length
    ? preview.org_names.join(', ')
    : preview?.org_name ?? '';

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 text-center border-b border-gray-100">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mx-auto mb-4 shadow-md">
              <Building2 className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Invitation à rejoindre</h1>
            {preview && (
              <div className="mt-2">
                <p className="text-sm font-semibold text-gray-800">{orgLabel}</p>
                {preview.inviter_email && (
                  <p className="text-xs text-gray-500 mt-0.5">invité par {preview.inviter_email}</p>
                )}
              </div>
            )}
          </div>

          {/* Body */}
          <div className="p-8">
            {error ? (
              <div className="text-center space-y-4">
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>
                <Button variant="outline" onClick={() => { window.history.replaceState({}, '', '/'); window.location.hash = '/login'; }} className="rounded-xl w-full">
                  Retour à l'accueil
                </Button>
              </div>
            ) : accepted ? (
              <div className="text-center space-y-3">
                <CheckCircle className="h-10 w-10 text-green-500 mx-auto" />
                <p className="text-sm font-medium text-gray-800">Invitation acceptée !</p>
                <p className="text-xs text-gray-500">Redirection en cours…</p>
              </div>
            ) : !preview ? (
              <p className="text-sm text-gray-500 text-center">Chargement…</p>
            ) : user ? (
              /* User is already logged in */
              user.email?.toLowerCase() !== preview.email.toLowerCase() ? (
                <div className="space-y-3 text-center">
                  <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    Vous êtes connecté avec <strong>{user.email}</strong>, mais cette invitation est destinée à <strong>{preview.email}</strong>.
                    Veuillez vous déconnecter pour continuer.
                  </p>
                  <Button
                    onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }}
                    className="w-full rounded-xl"
                  >
                    Se déconnecter
                  </Button>
                </div>
              ) : (
                /* Correct user — ask for password then accept */
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 text-center">
                    Définissez un mot de passe pour votre compte afin de pouvoir vous reconnecter.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="set-pw">Mot de passe</Label>
                    <div className="relative">
                      <Input
                        id="set-pw"
                        type={showPw ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="6 caractères minimum"
                        className="rounded-xl h-11 pr-10"
                        autoFocus
                      />
                      <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button
                    onClick={() => doAccept(password)}
                    disabled={submitting || password.length < 6}
                    className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 h-11 font-semibold"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Définir mon mot de passe et rejoindre
                  </Button>
                </div>
              )
            ) : (
              /* Not logged in — signup or signin */
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Adresse e-mail</Label>
                  <Input value={preview.email} disabled className="rounded-xl h-11 bg-gray-50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auth-pw">{mode === 'signup' ? 'Choisir un mot de passe' : 'Mot de passe'}</Label>
                  <div className="relative">
                    <Input
                      id="auth-pw"
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === 'signup' ? '6 caractères minimum' : ''}
                      className="rounded-xl h-11 pr-10"
                      autoFocus
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  onClick={handleAuthAndAccept}
                  disabled={submitting || password.length < 6}
                  className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 h-11 font-semibold"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {mode === 'signup' ? 'Créer mon compte et rejoindre' : 'Se connecter et rejoindre'}
                </Button>
                <div className="text-center">
                  <button
                    onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
                    className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    {mode === 'signup' ? "J'ai déjà un compte" : 'Créer un nouveau compte'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
