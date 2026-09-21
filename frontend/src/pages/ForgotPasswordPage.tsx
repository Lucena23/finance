import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Mail } from 'lucide-react';

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
import { isValidEmail, isNonEmpty } from '@/lib/validators';

export function ForgotPasswordPage(): JSX.Element {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setApiError(null);

    if (!isNonEmpty(email)) {
      setError('Informe o e-mail.');
      return;
    } else if (!isValidEmail(email)) {
      setError('E-mail inválido.');
      return;
    }

    setIsSubmitting(true);

    try {
      await authApi.forgotPassword({ email });
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setApiError(err.message);
      } else {
        setApiError('Ocorreu um erro ao tentar enviar o e-mail.');
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
            <img src="/logo-icon.jpg" alt="Aksurim Logo" className="h-12 w-12 object-contain" />
          </div>
          <div>
            <CardTitle className="text-2xl">Recuperar Senha</CardTitle>
            <CardDescription className="mt-1">
              Digite seu e-mail para receber as instruções de recuperação.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {success ? (
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="rounded-full bg-primary/10 p-3 text-primary">
                <Mail className="h-6 w-6" />
              </div>
              <p className="text-sm">
                Se o e-mail existir na nossa base, você receberá um link em instantes para redefinir sua senha.
              </p>
              <Link to="/login" className="mt-4 w-full">
                <Button variant="outline" className="w-full">
                  Voltar ao Login
                </Button>
              </Link>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              {apiError ? (
                <div role="alert" className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm text-center">
                  {apiError}
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="email">E-mail cadastrado</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="voce@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={Boolean(error)}
                />
                {error ? <p className="text-destructive text-xs">{error}</p> : null}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? 'Enviando...' : 'Enviar Link'}
              </Button>
            </form>
          )}

          {!success && (
            <p className="text-muted-foreground mt-6 text-center text-sm">
              Lembrou a senha?{' '}
              <Link to="/login" className="text-primary font-medium underline-offset-4 hover:underline">
                Voltar
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
