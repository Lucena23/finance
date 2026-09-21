/**
 * RegisterPage.tsx — Tela de criação de conta (TAREFA 36).
 *
 * Responsabilidades:
 *  - Formulário de registro: nome, e-mail, senha, nome da família e CPF.
 *  - Validação client-side (e-mail, senha >= 8, CPF válido — RN-02).
 *  - Máscara progressiva de CPF durante a digitação.
 *  - Feedback de erro da API (409 e-mail/CPF duplicado, 400 validação).
 *  - Autenticação automática e redirecionamento após o cadastro.
 *
 * REGRA (§8.1): proibido o uso de `any`. Todos os tipos são explícitos.
 */

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, UserPlus } from 'lucide-react';

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
import {
  formatCpfInput,
  isNonEmpty,
  isValidCpf,
  isValidEmail,
  isValidPassword,
} from '@/lib/validators';

interface RegisterFormState {
  name: string;
  email: string;
  whatsapp: string;
  password: string;
  familyName: string;
  ownerCpf: string;
}

interface RegisterFormErrors {
  name?: string;
  email?: string;
  whatsapp?: string;
  password?: string;
  familyName?: string;
  ownerCpf?: string;
}

/**
 * Tela de criação de conta + workspace familiar.
 */
export function RegisterPage(): JSX.Element {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<RegisterFormState>({
    name: '',
    email: '',
    whatsapp: '',
    password: '',
    familyName: '',
    ownerCpf: '',
  });
  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  /**
   * Valida todos os campos do formulário de registro.
   */
  function formatWhatsApp(value: string): string {
    const digits = value.replace(/\D/g, '').substring(0, 11);
    if (digits.length === 0) return '';
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  function validate(): RegisterFormErrors {
    const nextErrors: RegisterFormErrors = {};

    if (!isNonEmpty(form.name)) {
      nextErrors.name = 'Informe seu nome.';
    }

    if (!isNonEmpty(form.email)) {
      nextErrors.email = 'Informe o e-mail.';
    } else if (!isValidEmail(form.email)) {
      nextErrors.email = 'E-mail inválido.';
    }

    if (!isNonEmpty(form.whatsapp)) {
      nextErrors.whatsapp = 'Informe o seu WhatsApp.';
    } else if (form.whatsapp.replace(/\D/g, '').length < 10) {
      nextErrors.whatsapp = 'Número inválido.';
    }

    if (!isNonEmpty(form.password)) {
      nextErrors.password = 'Informe uma senha.';
    } else if (!isValidPassword(form.password)) {
      nextErrors.password = 'A senha deve ter ao menos 8 caracteres.';
    }

    if (!isNonEmpty(form.familyName)) {
      nextErrors.familyName = 'Informe o nome da família.';
    }

    if (!isNonEmpty(form.ownerCpf)) {
      nextErrors.ownerCpf = 'Informe o CPF do titular.';
    } else if (!isValidCpf(form.ownerCpf)) {
      nextErrors.ownerCpf = 'CPF inválido.';
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
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        whatsapp: form.whatsapp.replace(/\D/g, ''),
        password: form.password,
        familyName: form.familyName.trim(),
        ownerCpf: form.ownerCpf,
      });
      navigate('/', { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setApiError(
          error.status === 409
            ? 'E-mail ou CPF já cadastrado.'
            : error.message,
        );
      } else {
        setApiError('Não foi possível criar a conta. Tente novamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4 py-10 flex-col">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            {/* Aqui usamos a logo-icon.png que é apenas o ícone/logo sem o texto */}
            <img src="/logo-icon.png" alt="Aksurim Logo" className="h-12 w-12 object-contain" />
          </div>
          <div>
            <CardTitle className="text-2xl">Criar conta</CardTitle>
            <CardDescription className="mt-1">
              Crie o workspace familiar e comece a organizar os compromissos financeiros compartilhados.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form
            className="space-y-4"
            onSubmit={handleSubmit}
            noValidate
            aria-label="Formulário de registro"
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
              <Label htmlFor="name">Nome completo</Label>
              <Input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Maria Silva"
                value={form.name}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'name-error' : undefined}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
              {errors.name ? (
                <p id="name-error" className="text-destructive text-xs">
                  {errors.name}
                </p>
              ) : null}
            </div>

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
              <Label htmlFor="whatsapp">WhatsApp (com DDD)</Label>
              <Input
                id="whatsapp"
                name="whatsapp"
                type="tel"
                inputMode="numeric"
                placeholder="(11) 99999-9999"
                value={form.whatsapp}
                aria-invalid={Boolean(errors.whatsapp)}
                aria-describedby={errors.whatsapp ? 'whatsapp-error' : undefined}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, whatsapp: formatWhatsApp(event.target.value) }))
                }
              />
              {errors.whatsapp ? (
                <p id="whatsapp-error" className="text-destructive text-xs">
                  {errors.whatsapp}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
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

            <div className="space-y-2">
              <Label htmlFor="familyName">Nome da família</Label>
              <Input
                id="familyName"
                name="familyName"
                type="text"
                placeholder="Família Silva"
                value={form.familyName}
                aria-invalid={Boolean(errors.familyName)}
                aria-describedby={
                  errors.familyName ? 'familyName-error' : undefined
                }
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    familyName: event.target.value,
                  }))
                }
              />
              {errors.familyName ? (
                <p id="familyName-error" className="text-destructive text-xs">
                  {errors.familyName}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerCpf">CPF do titular</Label>
              <Input
                id="ownerCpf"
                name="ownerCpf"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="000.000.000-00"
                value={form.ownerCpf}
                aria-invalid={Boolean(errors.ownerCpf)}
                aria-describedby={
                  errors.ownerCpf ? 'ownerCpf-error' : undefined
                }
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    ownerCpf: formatCpfInput(event.target.value),
                  }))
                }
              />
              {errors.ownerCpf ? (
                <p id="ownerCpf-error" className="text-destructive text-xs">
                  {errors.ownerCpf}
                </p>
              ) : null}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <UserPlus className="h-4 w-4" aria-hidden="true" />
              )}
              {isSubmitting ? 'Criando conta…' : 'Criar conta'}
            </Button>
          </form>

          <p className="text-muted-foreground mt-6 text-center text-sm">
            Já tem uma conta?{' '}
            <Link
              to="/login"
              className="text-primary font-medium underline-offset-4 hover:underline"
            >
              Entrar
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
