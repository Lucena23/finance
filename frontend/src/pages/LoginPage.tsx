/**
 * LoginPage.tsx — Tela de autenticação (TAREFA 36).
 *
 * Responsabilidades:
 *  - Formulário de login (email + senha) com validação client-side.
 *  - Feedback de erro da API exibido ao usuário (401, 400, rede).
 *  - Redirecionamento para a rota de origem (ou raiz) após autenticar.
 *  - Link para a tela de registro.
 *
 * REGRA (§8.1): proibido o uso de `any`. Todos os tipos são explícitos.
 */

import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, LogIn } from 'lucide-react';

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
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/lib/api';
import { isValidEmail, isNonEmpty } from '@/lib/validators';

interface LoginFormState {
  email: string;
  password: string;
}

interface LoginFormErrors {
  email?: string;
  password?: string;
}

interface LocationState {
  from?: { pathname: string };
}

/**
 * Tela de login do Finanças Aksurim.
 */
export function LoginPage(): JSX.Element {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState<LoginFormState>({ email: '', password: '' });
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const redirectTo =
    (location.state as LocationState | null)?.from?.pathname ?? '/';

  /**
   * Valida os campos do formulário e retorna o mapa de erros.
   */
  function validate(): LoginFormErrors {
    const nextErrors: LoginFormErrors = {};

    if (!isNonEmpty(form.email)) {
      nextErrors.email = 'Informe o e-mail.';
    } else if (!isValidEmail(form.email)) {
      nextErrors.email = 'E-mail inválido.';
    }

    if (!isNonEmpty(form.password)) {
      nextErrors.password = 'Informe a senha.';
    }

    return nextErrors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setApiError(null);

    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      await login({ email: form.email.trim(), password: form.password });
      navigate(redirectTo, { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setApiError(
          error.status === 401
            ? 'E-mail ou senha incorretos.'
            : error.message,
        );
      } else {
        setApiError('Não foi possível entrar. Tente novamente.');
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
            {/* Aqui usamos a favicon.png que é apenas o ícone/logo sem o texto */}
            <img src="/favicon.png" alt="Aksurim Logo" className="h-12 w-12 object-contain" />
          </div>
          <div>
            <CardTitle className="text-2xl">Entrar</CardTitle>
            <CardDescription className="mt-1">
              Acesse sua conta para gerenciar os compromissos financeiros da família.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form
            className="space-y-4"
            onSubmit={handleSubmit}
            noValidate
            aria-label="Formulário de login"
          >
            {apiError ? (
              <div
                role="alert"
                className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm text-center"
              >
                {apiError}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="voce@exemplo.com"
                value={form.email}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'email-error' : undefined}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, email: event.target.value }))
                }
              />
              {errors.email ? (
                <p id="email-error" className="text-destructive text-xs">
                  {errors.email}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <Link
                  to="/forgot-password"
                  className="text-primary text-xs font-medium underline-offset-4 hover:underline"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={
                  errors.password ? 'password-error' : undefined
                }
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, password: event.target.value }))
                }
              />
              {errors.password ? (
                <p id="password-error" className="text-destructive text-xs">
                  {errors.password}
                </p>
              ) : null}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <LogIn className="h-4 w-4" aria-hidden="true" />
              )}
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <p className="text-muted-foreground mt-6 text-center text-sm">
            Não tem uma conta?{' '}
            <Link
              to="/register"
              className="text-primary font-medium underline-offset-4 hover:underline"
            >
              Criar conta
            </Link>
          </p>
        </CardContent>
      </Card>
      
      {/* Direitos Autorais e Marca Registrada */}
      <footer className="mt-8 text-center text-xs text-muted-foreground/60">
        <p>&copy; {new Date().getFullYear()} Aksurim Software.</p>
        <p>Marca Registrada. Todos os direitos reservados.</p>
      </footer>
    </main>
  );
}
