import { FormEvent, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, KeyRound } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, authApi } from '@/lib/api';
import { isValidPassword } from '@/lib/validators';

export function ResetPasswordPage(): JSX.Element {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setApiError(null);

    if (!token) {
      setApiError('Token inválido ou ausente na URL.');
      return;
    }

    if (!isValidPassword(password)) {
      setError('A senha deve ter no mínimo 8 caracteres.');
      return;
    }

    setIsSubmitting(true);

    try {
      await authApi.resetPassword({ token, newPassword: password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      if (err instanceof ApiError) {
        setApiError(err.message);
      } else {
        setApiError('Ocorreu um erro ao tentar redefinir a senha.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4 flex-col">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <img src="/logo-icon.png" alt="Aksurim Logo" className="h-12 w-12 object-contain" />
          </div>
          <div>
            <CardTitle className="text-2xl">Nova Senha</CardTitle>
            <CardDescription className="mt-1">
              Crie uma nova senha segura para sua conta.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {success ? (
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="rounded-full bg-green-500/10 p-3 text-green-500">
                <KeyRound className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium">Senha alterada com sucesso!</p>
              <p className="text-muted-foreground text-xs">Redirecionando para o login...</p>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              {apiError ? (
                <div role="alert" className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm text-center">
                  {apiError}
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={Boolean(error)}
                />
                {error ? <p className="text-destructive text-xs">{error}</p> : null}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? 'Salvando...' : 'Salvar Senha'}
              </Button>
            </form>
          )}

          {!success && (
            <p className="text-muted-foreground mt-6 text-center text-sm">
              <Link to="/login" className="text-primary font-medium underline-offset-4 hover:underline">
                Voltar ao Login
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
      
      <footer className="mt-8 text-center text-xs text-muted-foreground/60">
        <p>&copy; {new Date().getFullYear()} Aksurim Software.</p>
        <p>Marca Registrada. Todos os direitos reservados.</p>
      </footer>
    </main>
  );
}
