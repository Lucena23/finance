/**
 * PayDrawer.tsx — Gaveta modal de quitação de um PaymentItem (TAREFA 40 + v1.2.8).
 *
 * Apresenta um drawer (Radix Dialog posicionado como painel lateral/inferior
 * mobile-first) para registrar a baixa de um compromisso pendente. Campos:
 *  - Valor previsto (somente leitura, pré-preenchido com expectedAmount).
 *  - Valor final pago (editável — permite pagamento parcial, desconto, juros ou reajuste).
 *  - Seletor inteligente quando paidAmount !== expectedAmount:
 *      • Menor: Pagamento Parcial (mantém saldo restante aberto) vs. Desconto (quita 100%).
 *      • Maior: Juros/Multa (pontual) vs. Reajuste (atualiza próximas cobranças).
 *  - Data de pagamento (default: hoje, no fuso America/Sao_Paulo).
 *  - Observação livre (opcional — comprovante, juros, etc.).
 *
 * REGRAS:
 *  - §8.2: valores monetários trafegam como inteiros (centavos).
 *  - §8.1: proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import * as Dialog from '@radix-ui/react-dialog';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Percent,
  Split,
  TrendingUp,
  X,
} from 'lucide-react';
import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ApiError,
  paymentItemsApi,
  type PaymentDifferenceHandling,
  type PaymentItemWithPayer,
} from '@/lib/api';
import { cn } from '@/lib/cn';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import { formatCurrency, parseCurrencyToCents } from '@/lib/utils';

interface PayDrawerProps {
  /** Item de pagamento a ser quitado. Quando null, o drawer fica fechado. */
  item: PaymentItemWithPayer | null;
  /** Controla a abertura do drawer. */
  open: boolean;
  /** Callback disparado ao fechar o drawer (sem quitar). */
  onOpenChange: (open: boolean) => void;
  /** Callback disparado após uma quitação bem-sucedida. */
  onPaid?: (paid: PaymentItemWithPayer) => void;
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

  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const day = parts.find((part) => part.type === 'day')?.value ?? '';

  return `${year}-${month}-${day}`;
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
  const [lowerHandling, setLowerHandling] = useState<'PARTIAL' | 'DISCOUNT'>(
    'PARTIAL',
  );
  const [higherHandling, setHigherHandling] = useState<
    'INTEREST' | 'READJUSTMENT'
  >('INTEREST');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Pré-preenche o formulário sempre que um novo item é aberto.
  useEffect(() => {
    if (open && item) {
      setAmountInput((item.expectedAmount / 100).toFixed(2).replace('.', ','));
      setPaidDate(todayIsoDate());
      setNotes('');
      setLowerHandling('PARTIAL');
      setHigherHandling('INTEREST');
      setError(null);
      setIsSubmitting(false);
    }
  }, [open, item]);

  const paidAmountCents = useMemo<number>(
    () => parseCurrencyToCents(amountInput),
    [amountInput],
  );

  const isAmountValid = paidAmountCents > 0;
  const expectedAmountCents = item?.expectedAmount ?? 0;
  const isSmallerAmount =
    isAmountValid && paidAmountCents < expectedAmountCents;
  const isLargerAmount =
    isAmountValid && paidAmountCents > expectedAmountCents;
  const diffCents = Math.abs(paidAmountCents - expectedAmountCents);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();

    if (!item) {
      return;
    }

    if (!isAmountValid) {
      setError('Informe um valor pago maior que zero.');
      return;
    }

    let differenceHandling: PaymentDifferenceHandling | undefined;
    if (isSmallerAmount) {
      differenceHandling = lowerHandling;
    } else if (isLargerAmount) {
      differenceHandling = higherHandling;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const paid = await paymentItemsApi.pay(item.id, {
        paidAmount: paidAmountCents,
        paidAt: isoDateToTimestamp(paidDate),
        notes: notes.trim().length > 0 ? notes.trim() : undefined,
        differenceHandling,
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
            'inset-x-0 bottom-0 max-h-[92vh] rounded-t-2xl p-5',
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
              className="flex flex-1 flex-col gap-4 overflow-y-auto pr-0.5"
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
                  Informe o valor pago (parcial, com desconto, juros ou reajuste).
                </p>
              </div>

              {/* CENÁRIO 1: Valor MENOR que o previsto */}
              {isSmallerAmount ? (
                <div
                  className="flex flex-col gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3"
                  data-testid="pay-drawer-smaller-options"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-amber-300">
                      Valor menor que o previsto (-{formatCurrency(diffCents)})
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    O pagamento é parcial ou você conseguiu um desconto?
                  </p>

                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => setLowerHandling('PARTIAL')}
                      data-testid="pay-option-partial"
                      className={cn(
                        'flex items-start gap-2.5 rounded-md border p-2.5 text-left transition-all',
                        lowerHandling === 'PARTIAL'
                          ? 'border-amber-400 bg-amber-500/20 ring-1 ring-amber-400'
                          : 'border-border/60 bg-background/60 hover:bg-muted/50',
                      )}
                    >
                      <Split
                        aria-hidden="true"
                        className="mt-0.5 h-4 w-4 shrink-0 text-amber-400"
                      />
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold">
                          Pagamento Parcial (Manter restante aberto)
                        </span>
                        <span className="text-muted-foreground text-[11px] leading-snug">
                          Quita{' '}
                          <strong className="text-foreground">
                            {formatCurrency(paidAmountCents)}
                          </strong>{' '}
                          agora e mantém{' '}
                          <strong className="text-amber-300">
                            {formatCurrency(diffCents)}
                          </strong>{' '}
                          em aberto na fila para pagar depois.
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLowerHandling('DISCOUNT')}
                      data-testid="pay-option-discount"
                      className={cn(
                        'flex items-start gap-2.5 rounded-md border p-2.5 text-left transition-all',
                        lowerHandling === 'DISCOUNT'
                          ? 'border-emerald-400 bg-emerald-500/20 ring-1 ring-emerald-400'
                          : 'border-border/60 bg-background/60 hover:bg-muted/50',
                      )}
                    >
                      <Percent
                        aria-hidden="true"
                        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
                      />
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold">
                          Quitação com Desconto / Acordo
                        </span>
                        <span className="text-muted-foreground text-[11px] leading-snug">
                          Encerra 100% da conta com economia de{' '}
                          <strong className="text-emerald-300">
                            {formatCurrency(diffCents)}
                          </strong>{' '}
                          (sem deixar saldo restante).
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              ) : null}

              {/* CENÁRIO 2: Valor MAIOR que o previsto */}
              {isLargerAmount ? (
                <div
                  className="flex flex-col gap-2.5 rounded-lg border border-orange-500/40 bg-orange-500/10 p-3"
                  data-testid="pay-drawer-larger-options"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-orange-300">
                      Valor maior que o previsto (+{formatCurrency(diffCents)})
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Confirme o motivo do acréscimo para atualizar seus relatórios:
                  </p>

                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => setHigherHandling('INTEREST')}
                      data-testid="pay-option-interest"
                      className={cn(
                        'flex items-start gap-2.5 rounded-md border p-2.5 text-left transition-all',
                        higherHandling === 'INTEREST'
                          ? 'border-rose-400 bg-rose-500/20 ring-1 ring-rose-400'
                          : 'border-border/60 bg-background/60 hover:bg-muted/50',
                      )}
                    >
                      <AlertTriangle
                        aria-hidden="true"
                        className="mt-0.5 h-4 w-4 shrink-0 text-rose-400"
                      />
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold">
                          Juros / Multa / Encargos (Apenas nesta conta)
                        </span>
                        <span className="text-muted-foreground text-[11px] leading-snug">
                          Registra{' '}
                          <strong className="text-rose-300">
                            +{formatCurrency(diffCents)}
                          </strong>{' '}
                          como juros/encargos no painel e relatórios. Não altera próximas parcelas.
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setHigherHandling('READJUSTMENT')}
                      data-testid="pay-option-readjustment"
                      className={cn(
                        'flex items-start gap-2.5 rounded-md border p-2.5 text-left transition-all',
                        higherHandling === 'READJUSTMENT'
                          ? 'border-primary bg-primary/20 ring-1 ring-primary'
                          : 'border-border/60 bg-background/60 hover:bg-muted/50',
                      )}
                    >
                      <TrendingUp
                        aria-hidden="true"
                        className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                      />
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold">
                          Reajuste de Valor (Atualizar próximas cobranças)
                        </span>
                        <span className="text-muted-foreground text-[11px] leading-snug">
                          Quita esta conta e reajusta automaticamente as próximas parcelas ou recorrências em aberto para{' '}
                          <strong className="text-foreground">
                            {formatCurrency(paidAmountCents)}
                          </strong>
                          .
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              ) : null}

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
                  rows={2}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Comprovante, acordo, observações…"
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
                    <Loader2
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin"
                    />
                  ) : (
                    <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                  )}
                  {isSmallerAmount && lowerHandling === 'PARTIAL'
                    ? 'Confirmar pagamento parcial'
                    : 'Confirmar quitação'}
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
