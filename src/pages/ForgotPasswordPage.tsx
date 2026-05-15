import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Monitor, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error('Veuillez entrer votre email');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email);
      setEmailSent(true);
      toast.success('Email de réinitialisation envoyé');
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    window.location.hash = '/login';
  };

  if (emailSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-slate-50/90 to-white p-4">
        <div className="w-full max-w-md">
          <Card className="rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-900/10">
            <CardContent className="px-8 pb-12 pt-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="mb-4 text-2xl font-medium tracking-tight text-slate-900">Email envoyé !</h2>
              <p className="mb-8 text-[15px] leading-relaxed text-slate-600">
                Un lien de réinitialisation a été envoyé à <strong>{email}</strong>.
                <br />
                Consultez votre boîte de réception.
              </p>
              <Button
                onClick={handleBackToLogin}
                size="lg"
                className="w-full rounded-xl text-base font-medium shadow-md shadow-primary/20"
              >
                Retour à la connexion
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-slate-50/90 to-white p-4">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 shadow-lg shadow-slate-900/20">
            <Monitor className="h-8 w-8 text-white" />
          </div>
          <h1 className="mb-2 text-3xl font-medium tracking-tight text-slate-900">Montet</h1>
          <p className="text-[15px] text-slate-500">Gestion d&apos;affichage dynamique</p>
        </div>

        <Card className="rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-900/10">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-center text-2xl font-medium tracking-tight text-slate-900">
              Mot de passe oublié
            </CardTitle>
            <CardDescription className="text-center text-[15px] text-slate-500">
              Entrez votre email pour réinitialiser votre mot de passe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nom@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
              <Button
                type="submit"
                size="lg"
                className="w-full rounded-xl text-base font-medium shadow-md shadow-primary/20"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  'Envoyer le lien de réinitialisation'
                )}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={handleBackToLogin}
                className="inline-flex items-center gap-2 text-sm text-slate-500 underline-offset-2 transition-colors hover:text-slate-900"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour à la connexion
              </button>
            </div>
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-sm text-slate-400">
          Montet © 2025 - Tous droits réservés
        </p>
      </div>
    </div>
  );
}
