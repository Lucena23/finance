/**
 * PaidDetailsDrawer.tsx — Gaveta modal de DETALHES de um pagamento já quitado
 * (TAREFA 14).
 *
 * Ao clicar em um card verde (pago) na fila/histórico, abre-se este drawer com
 * os detalhes completos da quitação (BLUEPRINT §4 — "UX de Pagamentos
 * Quitados"):
 *  - Nome do pagador (quem quitou o compromisso).
 *  - Data e Hora exata em que o pagamento foi salvo (`paidAt`).
 *  - Observação inserida no momento da quitação (`notes`).
 *  - Valores previsto e efetivamente pago (centavos → exibição).
 *
 * O componente é somente leitura — não realiza nenhuma mutação. Reutiliza o
 * padrão de Radix Dialog (gaveta inferior no mobile / painel lateral no
 * desktop) já consolidado no PayDrawer, garantindo consistência de UX.
 *
 * REGRAS:
 *  - §8.2: valores monetários trafegam como inteiros (centavos). A conversão
 *    para exibição usa formatCurrency (camada de apresentação exclusivamente).
 *  - §8.1: proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import * as Dialog from '@radix-ui/react-dialog';
import { CalendarClock, CheckCircle2, MessageSquareText, User, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { MemberBadge } from '@/components/member/MemberBadge';
import type { PaymentItemWithPayer } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

interface PaidDetailsDrawerProps {
  /** Item de pagamento quitado a ser detalhado. Quando null, fica fechado. */
  item: PaymentItemWithPayer | null;
  /** Controla a abertura do drawer. */
  open: boolean;
  /** Callback disparado ao alterar o estado de abertura. */
  onOpenChange: (open: boolean) => void;
  /** Callback disparado ao desfazer o pagamento. */
  onUndoPay?: (item: PaymentItemWithPayer) => void;
  /** Estado de carregamento do desfazimento */
  isUndoing?: boolean;
}

/**
 * Linha de detalhe rotulada (label + valor) reutilizável.
 */
interface DetailRowProps {
  /** Ícone Lucide renderizado à esquerda. */
  icon: JSX.Element;
  /** Rótulo descritivo do campo. */
  label: string;
  /** Conteúdo do valor (texto ou nó). */
  children: React.ReactNode;
}

function DetailRow({ icon, label, children }: DetailRowProps): JSX.Element {
  return (
    <div className="flex items-start gap-3 rounded-md border border-border/60 bg-muted/30 px-3 py-3">
      <span className="text-primary mt-0.5 shrink-0" aria-hidden="true">
        {icon}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
        <span className="text-sm font-semibold break-words">{children}</span>
      </div>
    </div>
  );
}

/**
 * Gaveta modal com os detalhes completos de um pagamento quitado.
 */
export function PaidDetailsDrawer({
  item,
  open,
  onOpenChange,
  onUndoPay,
  isUndoing,
}: PaidDetailsDrawerProps): JSX.Element {
  const payer = item?.paidBy ?? null;
  const paidAmount = item?.paidAmount ?? item?.expectedAmount ?? 0;
  const hasNotes = Boolean(item?.notes && item.notes.trim().length > 0);

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
          data-testid="paid-details-drawer"
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
              <Dialog.Title className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                <CheckCircle2
                  aria-hidden="true"
                  className="h-5 w-5 text-emerald-500"
                />
                Detalhes do pagamento
              </Dialog.Title>
              <Dialog.Description className="text-muted-foreground text-sm">
                {item?.expense?.title || 'Despesa Sem Nome'}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Fechar detalhes do pagamento"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </header>

          {item ? (
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
              {/* Valor efetivamente pago (destaque) */}
              <div className="flex items-center justify-between rounded-md bg-emerald-500/10 px-3 py-3">
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Valor pago
                </span>
                <span
                  className="text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-400"
                  data-testid="paid-details-amount"
                >
                  {formatCurrency(paidAmount)}
                </span>
              </div>

              {/* Pagador */}
              <DetailRow
                icon={<User className="h-4 w-4" />}
                label="Pago por"
              >
                <span
                  className="flex items-center gap-2"
                  data-testid="paid-details-payer"
                >
                  {payer ? (
                    <MemberBadge
                      initials={payer.initials}
                      avatarColor={payer.avatarColor}
                      size="sm"
                      label={`Pago por ${payer.initials}`}
                    />
                  ) : null}
                  <span>{payer ? payer.initials : 'Não informado'}</span>
                </span>
              </DetailRow>

              {/* Data e hora exata da quitação */}
              <DetailRow
                icon={<CalendarClock className="h-4 w-4" />}
                label="Data e hora do pagamento"
              >
                <span data-testid="paid-details-datetime">
                  {item.paidAt
                    ? formatDateTime(item.paidAt)
                    : formatDate(item.dueDate)}
                </span>
              </DetailRow>

              {/* Observação inserida na hora do pagamento */}
              <DetailRow
                icon={<MessageSquareText className="h-4 w-4" />}
                label="Observação"
              >
                <span
                  className={cn(
                    !hasNotes && 'text-muted-foreground font-normal italic',
                  )}
                  data-testid="paid-details-notes"
                >
                  {hasNotes ? item.notes : 'Nenhuma observação registrada.'}
                </span>
              </DetailRow>

              {/* Valor previsto (referência) */}
              <div className="text-muted-foreground flex items-center justify-between px-3 text-xs">
                <span>Valor previsto</span>
                <span className="tabular-nums">
                  {formatCurrency(item.expectedAmount)}
                </span>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 mt-2">
             <Dialog.Close asChild>
               <Button type="button" variant="outline" className="w-full">
                 Fechar
               </Button>
             </Dialog.Close>
             {onUndoPay && item ? (
               <Button 
                 type="button" 
                 variant="ghost" 
                 className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive" 
                 onClick={() => onUndoPay(item)}
                 disabled={isUndoing}
               >
                 {isUndoing ? 'Desfazendo...' : 'Desfazer Quitação'}
               </Button>
             ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
