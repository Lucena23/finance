/**
 * PaymentCard.tsx — Card individual de um PaymentItem na fila (TAREFA 38 + v1.2.8).
 *
 * Apresenta os dados essenciais de uma obrigação pendente: título da despesa,
 * número da parcela, valor previsto formatado e data de vencimento, além de
 * um indicador colorido de urgência herdado do agrupamento (RN-06 / §8.5) e
 * selos de pagamento parcial, saldo restante, desconto, juros ou reajuste.
 */

import { CalendarClock, Repeat } from 'lucide-react';

import { MemberBadge } from '@/components/member/MemberBadge';
import type { PaymentItemWithPayer } from '@/lib/api';
import { cn } from '@/lib/cn';
import { QueueGroup } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/utils';

interface PaymentCardProps {
  /** Item de pagamento a ser exibido (com badge do pagador hidratado). */
  item: PaymentItemWithPayer;
  /** Agrupamento de urgência ao qual o item pertence. */
  urgency: QueueGroup | string;
  /** Classe de cor da barra lateral de urgência. */
  accentClass: string;
  /** Callback opcional disparado ao selecionar o card. */
  onSelect?: (item: PaymentItemWithPayer) => void;
  /** Se true, o card está sendo renderizado no histórico. */
  isHistory?: boolean;
}

/**
 * Rótulo textual do indicador de urgência por agrupamento.
 */
const URGENCY_LABEL: Record<string, string> = {
  OVERDUE: 'Em atraso',
  CURRENT_MONTH: 'Vence este mês',
  UPCOMING: 'A vencer',
  PAID: 'Pago',
};

function getDifferenceBadge(item: PaymentItemWithPayer): {
  label: string;
  className: string;
} | null {
  const notes = item.notes ?? '';
  if (notes.startsWith('[Saldo Restante')) {
    return {
      label: 'Saldo Restante',
      className: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
    };
  }
  if (notes.startsWith('[Pagamento Parcial')) {
    return {
      label: 'Parcial',
      className: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
    };
  }
  if (notes.startsWith('[Desconto:')) {
    return {
      label: 'c/ Desconto',
      className: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
    };
  }
  if (notes.startsWith('[Reajuste:')) {
    return {
      label: 'Reajustado',
      className: 'border-primary/40 bg-primary/15 text-primary',
    };
  }
  if (
    notes.startsWith('[Juros/Multa:') ||
    (item.status === 'PAID' &&
      item.paidAmount !== null &&
      item.paidAmount > item.expectedAmount)
  ) {
    return {
      label: 'c/ Juros',
      className: 'border-rose-500/40 bg-rose-500/15 text-rose-300',
    };
  }
  return null;
}

/**
 * Card de um compromisso pendente ou quitado na fila de pagamentos.
 */
export function PaymentCard({
  item,
  urgency,
  accentClass,
  onSelect,
  isHistory,
}: PaymentCardProps): JSX.Element {
  const isRecurrent = item.totalInstallments === 0;
  const installmentLabel = isRecurrent
    ? 'Recorrente'
    : `Parcela ${item.installmentNumber}/${item.totalInstallments}`;

  const isInteractive = typeof onSelect === 'function';
  const payer = item.paidBy;
  const diffBadge = getDifferenceBadge(item);

  const handleSelect = (): void => {
    onSelect?.(item);
  };

  return (
    <div
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={isInteractive ? handleSelect : undefined}
      onKeyDown={
        isInteractive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleSelect();
              }
            }
          : undefined
      }
      data-testid="payment-card"
      data-urgency={urgency}
      className={cn(
        'group bg-card text-card-foreground flex items-center justify-between gap-3 rounded-lg border border-l-4 p-3 shadow-sm transition-colors',
        accentClass,
        isInteractive &&
          'hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring cursor-pointer focus-visible:outline-none focus-visible:ring-2',
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-sm font-semibold group-hover:text-accent-foreground">
            {item.expense?.title || 'Despesa Sem Nome'}
          </span>
          {diffBadge ? (
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold leading-none',
                diffBadge.className,
              )}
            >
              {diffBadge.label}
            </span>
          ) : null}
        </div>
        <span className="text-muted-foreground group-hover:text-accent-foreground/80 truncate text-xs transition-colors">
          {installmentLabel}
        </span>
        <span className="text-muted-foreground group-hover:text-accent-foreground/80 flex items-center gap-1 text-[11px] transition-colors">
          {isHistory ? (
            <span className="text-emerald-600 group-hover:text-emerald-800 font-medium transition-colors">
              Pago em {formatDate(item.paidAt || item.dueDate)}
            </span>
          ) : (
            <>
              {isRecurrent ? (
                <Repeat aria-hidden="true" className="h-3 w-3" />
              ) : (
                <CalendarClock aria-hidden="true" className="h-3 w-3" />
              )}
              Vence em {formatDate(item.dueDate)}
            </>
          )}
        </span>
        <span className="text-muted-foreground group-hover:text-accent-foreground/80 text-[10px] transition-colors">
          {isHistory ? 'Quitado' : URGENCY_LABEL[urgency as string]}
        </span>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <span
          className={cn(
            'text-sm font-bold tabular-nums transition-colors group-hover:text-accent-foreground',
            isHistory && 'text-emerald-700 group-hover:text-emerald-900',
          )}
        >
          {formatCurrency(
            isHistory
              ? (item.paidAmount ?? item.expectedAmount)
              : item.expectedAmount,
          )}
        </span>

        {/* TAREFA 13: badge do pagador exibido imediatamente quando presente. */}
        {payer ? (
          <span
            className="flex items-center gap-1"
            data-testid="payment-card-payer"
          >
            <MemberBadge
              initials={payer.initials}
              avatarColor={payer.avatarColor}
              size="xs"
              label={`Pago por ${payer.initials}`}
            />
            <span className="text-muted-foreground text-[10px] font-medium">
              {payer.initials}
            </span>
          </span>
        ) : null}
      </div>
    </div>
  );
}
