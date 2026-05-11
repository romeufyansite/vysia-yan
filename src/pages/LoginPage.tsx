import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Monitor, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      toast.success('Connexion réussie');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Email ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-slate-50/90 to-white p-4">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 shadow-lg shadow-slate-900/20">
            <Monitor className="h-8 w-8 text-white" />
          </div>
          <h1 className="mb-2 text-3xl font-semibold tracking-tight text-slate-900">Montet</h1>
          <p className="text-[15px] leading-relaxed text-slate-500">Gestion d&apos;affichage dynamique</p>
        </div>

        <Card className="rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-900/10">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-center text-2xl font-semibold tracking-tight text-slate-900">
              Connexion
            </CardTitle>
            <CardDescription className="text-center text-[15px] text-slate-500">
              Connectez-vous à votre compte
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
            <div className="space-y-2.5">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
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
                    Connexion...
                  </>
                ) : (
                  'Se connecter'
                )}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => window.location.hash = '/forgot-password'}
                className="text-sm text-slate-500 underline-offset-2 transition-colors hover:text-slate-900"
              >
                Mot de passe oublié ?
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
