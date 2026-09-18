/**
 * PayDrawer.tsx — Gaveta modal de quitação de um PaymentItem (TAREFA 40).
 *
 * Apresenta um drawer (Radix Dialog posicionado como painel lateral/inferior
 * mobile-first) para registrar a baixa de um compromisso pendente. Campos:
 *  - Valor previsto (somente leitura, pré-preenchido com expectedAmount).
 *  - Valor final pago (editável — permite juros/desconto), em centavos (Int).
 *  - Data de pagamento (default: hoje, no fuso America/Sao_Paulo).
 *  - Observação livre (opcional — comprovante, juros, etc.).
 *
 * Ao confirmar, dispara PATCH /payment-items/:id/pay (RN-07) e, em caso de
 * sucesso, invoca `onPaid` para que a fila seja atualizada pelo consumidor.
 *
 * REGRAS:
 *  - §8.2: valores monetários trafegam como inteiros (centavos). A conversão
 *    de/para exibição usa parseCurrencyToCents/formatCurrency (camada de
 *    apresentação exclusivamente).
 *  - §8.1: proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import * as Dialog from '@radix-ui/react-dialog';
import { CheckCircle2, Loader2, X } from 'lucide-react';
import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ApiError,
  paymentItemsApi,
  type PaymentItem,
} from '@/lib/api';
import { cn } from '@/lib/cn';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import { formatCurrency, parseCurrencyToCents } from '@/lib/utils';

interface PayDrawerProps {
  /** Item de pagamento a ser quitado. Quando null, o drawer fica fechado. */
  item: PaymentItem | null;
  /** Controla a abertura do drawer. */
  open: boolean;
  /** Callback disparado ao fechar o drawer (sem quitar). */
  onOpenChange: (open: boolean) => void;
  /** Callback disparado após uma quitação bem-sucedida. */
  onPaid?: (paid: PaymentItem) => void;
}

/**
 * Retorna a data de hoje no formato "YYYY-MM-DD" no fuso America/Sao_Paulo,
 * adequado ao atributo `date` de um <input type="date">.
 */
function todayIsoDate(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: DEFAULT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(new Date());
}

/**
 * Converte uma data "YYYY-MM-DD" (input date) em um timestamp ISO 8601
 * ancorado ao meio-dia UTC, evitando deslocamento de dia por fuso horário.
 */
function isoDateToTimestamp(value: string): string {
  const [year, month, day] = value.split('-').map((part) => Number(part));

  if (!year || !month || !day) {
    return new Date().toISOString();
  }

  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).toISOString();
}

/**
 * Gaveta modal de quitação de um compromisso pendente.
 */
export function PayDrawer({
  item,
  open,
  onOpenChange,
  onPaid,
}: PayDrawerProps): JSX.Element {
  const amountFieldId = useId();
  const dateFieldId = useId();
  const notesFieldId = useId();

  const [amountInput, setAmountInput] = useState<string>('');
  const [paidDate, setPaidDate] = useState<string>(todayIsoDate());
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Pré-preenche o formulário sempre que um novo item é aberto.
  useEffect(() => {
    if (open && item) {
      setAmountInput((item.expectedAmount / 100).toFixed(2).replace('.', ','));
      setPaidDate(todayIsoDate());
      setNotes('');
      setError(null);
      setIsSubmitting(false);
    }
  }, [open, item]);

  const paidAmountCents = useMemo<number>(
    () => parseCurrencyToCents(amountInput),
    [amountInput],
  );

  const isAmountValid = paidAmountCents > 0;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (!item) {
      return;
    }

    if (!isAmountValid) {
      setError('Informe um valor pago maior que zero.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const paid = await paymentItemsApi.pay(item.id, {
        paidAmount: paidAmountCents,
        paidAt: isoDateToTimestamp(paidDate),
        notes: notes.trim().length > 0 ? notes.trim() : undefined,
      });

      onPaid?.(paid);
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Não foi possível registrar a quitação. Tente novamente.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
          )}
        />
        <Dialog.Content
          data-testid="pay-drawer"
          className={cn(
            'bg-background fixed z-50 flex flex-col gap-4 border shadow-lg',
            // Mobile-first: gaveta inferior ocupando a largura total.
            'inset-x-0 bottom-0 max-h-[90vh] rounded-t-2xl p-5',
            // Desktop/tablet: painel lateral direito.
            'sm:inset-y-0 sm:right-0 sm:left-auto sm:h-full sm:max-h-none sm:w-full sm:max-w-md sm:rounded-none sm:rounded-l-2xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
            'sm:data-[state=open]:slide-in-from-right sm:data-[state=closed]:slide-out-to-right',
          )}
        >
          <header className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <Dialog.Title className="text-lg font-semibold tracking-tight">
                Registrar quitação
              </Dialog.Title>
              <Dialog.Description className="text-muted-foreground text-sm">
                Confirme o valor efetivamente pago deste compromisso.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Fechar gaveta de quitação"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </header>

          {item ? (
            <form
              onSubmit={(event) => void handleSubmit(event)}
              className="flex flex-1 flex-col gap-4 overflow-y-auto"
            >
              {/* Valor previsto (somente leitura) */}
              <div className="bg-muted/50 flex items-center justify-between rounded-md px-3 py-2">
                <span className="text-muted-foreground text-sm">
                  Valor previsto
                </span>
                <span
                  className="text-sm font-semibold tabular-nums"
                  data-testid="pay-drawer-expected"
                >
                  {formatCurrency(item.expectedAmount)}
                </span>
              </div>

              {/* Valor final pago (editável) */}
              <div className="flex flex-col gap-2">
                <Label htmlFor={amountFieldId}>Valor pago (R$)</Label>
                <Input
                  id={amountFieldId}
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0,00"
                  value={amountInput}
                  onChange={(event) => setAmountInput(event.target.value)}
                  aria-invalid={!isAmountValid && amountInput.length > 0}
                  data-testid="pay-drawer-amount"
                />
                <p className="text-muted-foreground text-xs">
                  Ajuste o valor para incluir juros ou descontos, se houver.
                </p>
              </div>

              {/* Data de pagamento */}
              <div className="flex flex-col gap-2">
                <Label htmlFor={dateFieldId}>Data do pagamento</Label>
                <Input
                  id={dateFieldId}
                  type="date"
                  value={paidDate}
                  onChange={(event) => setPaidDate(event.target.value)}
                  data-testid="pay-drawer-date"
                />
              </div>

              {/* Observação livre */}
              <div className="flex flex-col gap-2">
                <Label htmlFor={notesFieldId}>Observação (opcional)</Label>
                <textarea
                  id={notesFieldId}
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Comprovante, juros aplicados, observações…"
                  data-testid="pay-drawer-notes"
                  className={cn(
                    'border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                  )}
                />
              </div>

              {error ? (
                <p
                  role="alert"
                  className="text-destructive text-sm font-medium"
                  data-testid="pay-drawer-error"
                >
                  {error}
                </p>
              ) : null}

              <div className="mt-auto flex flex-col gap-2 pt-2 sm:flex-row-reverse">
                <Button
                  type="submit"
                  disabled={isSubmitting || !isAmountValid}
                  className="w-full sm:w-auto"
                  data-testid="pay-drawer-submit"
                >
                  {isSubmitting ? (
                    <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                  )}
                  Confirmar quitação
                </Button>
                <Dialog.Close asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto"
                  >
                    Cancelar
                  </Button>
                </Dialog.Close>
              </div>
            </form>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
