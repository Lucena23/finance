/**
 * PaymentQueue.tsx — Fila de Pagamentos com agrupamento visual por urgência
 * (TAREFA 38).
 *
 * Tela operacional principal do produto. Consome GET /payment-items/queue e
 * apresenta os itens pendentes em três agrupamentos hierárquicos fixos
 * (RN-06 / §8.5):
 *   🔴 Em atraso      — dueDate < hoje.
 *   🟠 Mês atual      — vencimento dentro do mês corrente.
 *   🔵 A vencer futuro — meses seguintes.
 *
 * A ordenação dentro de cada grupo (dueDate ASC) é responsabilidade do
 * backend; o componente apenas preserva a ordem recebida.
 *
 * Estados tratados:
 *  - Carregando: skeleton de feedback.
 *  - Erro: mensagem com ação de tentar novamente.
 *  - Vazio: estado vazio amigável (nenhuma pendência).
 *
 * REGRA (§8.1): proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePaymentQueue } from '@/hooks/usePaymentQueue';
import type { PaymentItem } from '@/lib/api';
import { cn } from '@/lib/cn';
import { QueueGroup } from '@/lib/constants';

import { PaymentCard } from './PaymentCard';

/**
 * Metadados visuais de cada agrupamento de urgência.
 */
interface QueueGroupMeta {
  /** Identificador do grupo (espelho do contrato da API). */
  key: QueueGroup;
  /** Rótulo exibido no cabeçalho do grupo. */
  label: string;
  /** Emoji indicador de urgência. */
  emoji: string;
  /** Classe de cor do texto do cabeçalho. */
  textClass: string;
  /** Classe de cor da barra lateral / borda do grupo. */
  accentClass: string;
  /** Classe de cor de fundo suave do cabeçalho. */
  headerBgClass: string;
}

/**
 * Ordem hierárquica fixa dos agrupamentos (atraso → mês atual → futuros).
 */
const GROUP_META: readonly QueueGroupMeta[] = [
  {
    key: QueueGroup.OVERDUE,
    label: 'Em atraso',
    emoji: '🔴',
    textClass: 'text-red-600',
    accentClass: 'border-l-red-500',
    headerBgClass: 'bg-red-50',
  },
  {
    key: QueueGroup.CURRENT_MONTH,
    label: 'Mês atual',
    emoji: '🟠',
    textClass: 'text-orange-500',
    accentClass: 'border-l-orange-400',
    headerBgClass: 'bg-orange-50',
  },
  {
    key: QueueGroup.UPCOMING,
    label: 'A vencer',
    emoji: '🔵',
    textClass: 'text-blue-600',
    accentClass: 'border-l-blue-500',
    headerBgClass: 'bg-blue-50',
  },
] as const;

interface PaymentQueueProps {
  /** Callback opcional disparado ao selecionar um item para quitação. */
  onSelectItem?: (item: PaymentItem) => void;
}

/**
 * Renderiza a fila de pagamentos agrupada por urgência.
 */
export function PaymentQueue({ onSelectItem }: PaymentQueueProps): JSX.Element {
  const { overdue, currentMonth, upcoming, isEmpty, isLoading, error, refetch } =
    usePaymentQueue();

  const groups: Record<QueueGroup, PaymentItem[]> = {
    [QueueGroup.OVERDUE]: overdue,
    [QueueGroup.CURRENT_MONTH]: currentMonth,
    [QueueGroup.UPCOMING]: upcoming,
  };

  // ── Estado de carregamento ────────────────────────────────────────────
  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col gap-3"
        data-testid="payment-queue-loading"
      >
        <span className="sr-only">Carregando fila de pagamentos…</span>
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="bg-muted h-20 w-full animate-pulse rounded-lg"
          />
        ))}
      </div>
    );
  }

  // ── Estado de erro ────────────────────────────────────────────────────
  if (error) {
    return (
      <Card
        role="alert"
        className="border-destructive/40"
        data-testid="payment-queue-error"
      >
        <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
          <AlertCircle aria-hidden="true" className="text-destructive h-8 w-8" />
          <p className="text-sm font-medium">{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
          >
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Estado vazio ──────────────────────────────────────────────────────
  if (isEmpty) {
    return (
      <Card data-testid="payment-queue-empty">
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <CheckCircle2
            aria-hidden="true"
            className="h-10 w-10 text-emerald-500"
          />
          <div className="flex flex-col gap-1">
            <p className="text-base font-semibold">Nenhuma pendência 🎉</p>
            <p className="text-muted-foreground text-sm">
              Você não possui contas pendentes no momento. Tudo em dia!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Fila com agrupamentos ─────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6" data-testid="payment-queue">
      {GROUP_META.map((meta) => {
        const items = groups[meta.key];

        // Grupos vazios não são renderizados (evita cabeçalhos órfãos).
        if (items.length === 0) {
          return null;
        }

        return (
          <section
            key={meta.key}
            aria-label={`${meta.label} (${items.length})`}
            data-testid={`payment-queue-group-${meta.key}`}
            className="flex flex-col gap-3"
          >
            <header
              className={cn(
                'flex items-center justify-between rounded-md px-3 py-2',
                meta.headerBgClass,
              )}
            >
              <h2
                className={cn(
                  'flex items-center gap-2 text-sm font-semibold',
                  meta.textClass,
                )}
              >
                <span aria-hidden="true">{meta.emoji}</span>
                {meta.label}
              </h2>
              <span
                className={cn(
                  'rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold',
                  meta.textClass,
                )}
              >
                {items.length}
              </span>
            </header>

            <ul className="flex flex-col gap-2">
              {items.map((item) => (
                <li key={item.id}>
                  <PaymentCard
                    item={item}
                    urgency={meta.key}
                    accentClass={meta.accentClass}
                    onSelect={onSelectItem}
                  />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
