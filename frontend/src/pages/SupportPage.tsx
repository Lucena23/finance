/**
 * SupportPage.tsx — Tela de Suporte ao Cliente (TAREFA 20).
 *
 * Formulário de contato que encaminha a mensagem do usuário ao suporte da
 * Aksurim via Telegram. O frontend NUNCA fala diretamente com o Telegram:
 * ele chama o endpoint do backend `POST /api/v1/support` (TAREFA 21 / RN-14),
 * que é o único autorizado a usar `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`.
 *
 * Recursos:
 *  - Campos: Assunto (obrigatório), Mensagem (obrigatória) e Contato opcional.
 *  - Validação client-side com feedback acessível (aria-invalid / role=alert).
 *  - Loading spinner durante o envio (feedback visual — §4 BLUEPRINT).
 *  - Estado de sucesso com confirmação e opção de enviar nova mensagem.
 *
 * ISOLAMENTO MULTI-TENANT (§8.3): nenhum `familyAccountId` é enviado — o
 * escopo e o remetente são derivados exclusivamente do JWT no backend.
 *
 * REGRA (§8.1): proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import { useState, type FormEvent } from 'react';
import { CheckCircle2, Loader2, MessageCircle, Send } from 'lucide-react';

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
import { ApiError, supportApi } from '@/lib/api';
import { isNonEmpty } from '@/lib/validators';

interface SupportFormState {
  subject: string;
  message: string;
  contact: string;
}

interface SupportFormErrors {
  subject?: string;
  message?: string;
}

const SUBJECT_MIN_LENGTH = 3;
const MESSAGE_MIN_LENGTH = 10;

/**
 * Tela de Suporte ao Cliente (rota "/support").
 */
export function SupportPage(): JSX.Element {
  const [form, setForm] = useState<SupportFormState>({
    subject: '',
    message: '',
    contact: '',
  });
  const [errors, setErrors] = useState<SupportFormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSent, setIsSent] = useState<boolean>(false);

  /**
   * Valida os campos obrigatórios e retorna o mapa de erros.
   */
  function validate(): SupportFormErrors {
    const nextErrors: SupportFormErrors = {};

    if (!isNonEmpty(form.subject)) {
      nextErrors.subject = 'Informe o assunto.';
    } else if (form.subject.trim().length < SUBJECT_MIN_LENGTH) {
      nextErrors.subject = `O assunto deve ter ao menos ${SUBJECT_MIN_LENGTH} caracteres.`;
    }

    if (!isNonEmpty(form.message)) {
      nextErrors.message = 'Descreva sua solicitação.';
    } else if (form.message.trim().length < MESSAGE_MIN_LENGTH) {
      nextErrors.message = `A mensagem deve ter ao menos ${MESSAGE_MIN_LENGTH} caracteres.`;
    }

    return nextErrors;
  }

  /**
   * Reseta o formulário para o estado inicial (após envio bem-sucedido).
   */
  function resetForm(): void {
    setForm({ subject: '', message: '', contact: '' });
    setErrors({});
    setApiError(null);
    setIsSent(false);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setApiError(null);

    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const trimmedContact = form.contact.trim();

      await supportApi.send({
        subject: form.subject.trim(),
        message: form.message.trim(),
        ...(trimmedContact ? { contact: trimmedContact } : {}),
      });

      setIsSent(true);
    } catch (error) {
      if (error instanceof ApiError) {
        setApiError(error.message);
      } else {
        setApiError(
          'Não foi possível enviar sua mensagem. Verifique sua conexão e tente novamente.',
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="flex flex-col gap-5 pb-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Suporte</h1>
        <p className="text-muted-foreground text-sm">
          Fale com a equipe Aksurim. Sua mensagem é encaminhada diretamente ao
          nosso canal de atendimento no Telegram.
        </p>
      </header>

      <Card className="border-t-4 border-t-primary shadow-sm">
        <CardHeader className="flex flex-row items-start gap-3 pb-2">
          <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
            <MessageCircle aria-hidden="true" className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-lg">Abrir um chamado</CardTitle>
            <CardDescription>
              Descreva sua dúvida, sugestão ou problema. Responderemos o mais
              breve possível.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {isSent ? (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-col items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-6 text-center"
              data-testid="support-success"
            >
              <CheckCircle2
                aria-hidden="true"
                className="h-10 w-10 text-emerald-500"
              />
              <div className="space-y-1">
                <p className="text-sm font-semibold">
                  Mensagem enviada com sucesso!
                </p>
                <p className="text-muted-foreground text-xs">
                  Nossa equipe recebeu seu chamado e responderá em breve.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetForm}
              >
                Enviar outra mensagem
              </Button>
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={handleSubmit}
              noValidate
              aria-label="Formulário de suporte"
            >
              {apiError ? (
                <div
                  role="alert"
                  className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm"
                  data-testid="support-error"
                >
                  {apiError}
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="support-subject">Assunto</Label>
                <Input
                  id="support-subject"
                  name="subject"
                  type="text"
                  maxLength={120}
                  placeholder="Ex: Erro ao editar despesa recorrente"
                  value={form.subject}
                  aria-invalid={Boolean(errors.subject)}
                  aria-describedby={
                    errors.subject ? 'support-subject-error' : undefined
                  }
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      subject: event.target.value,
                    }))
                  }
                />
                {errors.subject ? (
                  <p
                    id="support-subject-error"
                    className="text-destructive text-xs"
                  >
                    {errors.subject}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="support-message">Mensagem</Label>
                <textarea
                  id="support-message"
                  name="message"
                  rows={5}
                  maxLength={2000}
                  placeholder="Descreva detalhadamente sua solicitação…"
                  value={form.message}
                  aria-invalid={Boolean(errors.message)}
                  aria-describedby={
                    errors.message ? 'support-message-error' : undefined
                  }
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      message: event.target.value,
                    }))
                  }
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring aria-[invalid=true]:border-destructive flex w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                {errors.message ? (
                  <p
                    id="support-message-error"
                    className="text-destructive text-xs"
                  >
                    {errors.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="support-contact">
                  Contato{' '}
                  <span className="text-muted-foreground font-normal">
                    (opcional)
                  </span>
                </Label>
                <Input
                  id="support-contact"
                  name="contact"
                  type="text"
                  maxLength={160}
                  placeholder="E-mail ou telefone para retorno"
                  value={form.contact}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      contact: event.target.value,
                    }))
                  }
                />
                <p className="text-muted-foreground text-xs">
                  Se não informado, usaremos o e-mail da sua conta.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                data-testid="support-submit"
              >
                {isSubmitting ? (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Send className="h-4 w-4" aria-hidden="true" />
                )}
                {isSubmitting ? 'Enviando…' : 'Enviar mensagem'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
