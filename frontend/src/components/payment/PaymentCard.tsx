/**
 * PaymentCard.tsx — Card individual de um PaymentItem na fila (TAREFA 38).
 *
 * Apresenta os dados essenciais de uma obrigação pendente: título da despesa,
 * número da parcela, valor previsto formatado e data de vencimento, além de
 * um indicador colorido de urgência herdado do agrupamento (RN-06 / §8.5).
 *
 * Nota: a versão completa com ações de quitação (abertura do PayDrawer) e
 * acessibilidade por teclado é entregue na TAREFA 39. Este componente já
 * expõe o callback `onSelect` para integração futura.
 *
 * REGRA (§8.1): proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import { CalendarClock, Repeat } from 'lucide-react';

import type { PaymentItem } from '@/lib/api';
import { cn } from '@/lib/cn';
import { QueueGroup } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/utils';

interface PaymentCardProps {
  /** Item de pagamento a ser exibido. */
  item: PaymentItem;
  /** Agrupamento de urgência ao qual o item pertence. */
  urgency: QueueGroup | string;
  /** Classe de cor da barra lateral de urgência. */
  accentClass: string;
  /** Callback opcional disparado ao selecionar o card. */
  onSelect?: (item: PaymentItem) => void;
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

/**
 * Card de um compromisso pendente na fila de pagamentos.
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
        'bg-card flex items-center justify-between gap-3 rounded-lg border border-l-4 p-3 shadow-sm transition-colors',
        accentClass,
        isInteractive &&
          'hover:bg-accent focus-visible:ring-ring cursor-pointer focus-visible:outline-none focus-visible:ring-2',
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-sm font-semibold">
          {installmentLabel}
        </span>
        <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
          {isHistory ? (
             <span className="text-emerald-600 font-medium">Pago em {formatDate(item.paidAt || item.dueDate)}</span>
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
        <span className="text-muted-foreground text-[10px]">
          {isHistory ? 'Quitado' : URGENCY_LABEL[urgency as string]}
        </span>
      </div>

      <div className="flex shrink-0 flex-col items-end">
        <span className={cn("text-sm font-bold tabular-nums", isHistory && "text-emerald-700")}>
          {formatCurrency(isHistory ? (item.paidAmount ?? item.expectedAmount) : item.expectedAmount)}
        </span>
      </div>
    </div>
  );
}
