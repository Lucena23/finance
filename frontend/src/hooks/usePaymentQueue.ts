/**
 * usePaymentQueue.ts — Hook de consumo da Fila de Pagamentos (TAREFA 38).
 *
 * Encapsula o fetch de GET /payment-items/queue, expondo os três agrupamentos
 * de urgência (overdue, currentMonth, upcoming) já ordenados pelo backend
 * (RN-06 / §8.5), além de estados de carregamento, erro e refetch manual.
 *
 * O backend é a fonte única de verdade da ordenação (atraso → mês atual →
 * futuros, com ORDER BY dueDate ASC em cada grupo). O frontend apenas
 * apresenta os grupos na ordem hierárquica fixa.
 *
 * REGRA (§8.1): proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ApiError,
  paymentItemsApi,
  type PaymentItem,
  type PaymentQueue,
} from '@/lib/api';

/**
 * Filtros opcionais aceitos pela fila de pagamentos.
 */
export interface PaymentQueueFilters {
  /** Mês de referência (1–12). */
  month?: number;
  /** Ano de referência (ex: 2026). */
  year?: number;
  /** Filtra itens quitados por um membro específico. */
  paidById?: string;
}

/**
 * Estado e operações expostos pelo hook usePaymentQueue.
 */
export interface UsePaymentQueueResult {
  /** Itens em atraso (dueDate < hoje) — agrupamento vermelho. */
  overdue: PaymentItem[];
  /** Itens vencendo no mês corrente — agrupamento laranja. */
  currentMonth: PaymentItem[];
  /** Itens com vencimento em meses futuros — agrupamento azul. */
  upcoming: PaymentItem[];
  /** Total de itens pendentes somando os três agrupamentos. */
  totalPending: number;
  /** Indica se a fila está vazia (nenhum item pendente). */
  isEmpty: boolean;
  /** Indica se a requisição inicial está em andamento. */
  isLoading: boolean;
  /** Mensagem de erro legível, ou null quando não há falha. */
  error: string | null;
  /** Recarrega a fila a partir da API. */
  refetch: () => Promise<void>;
}

/** Estado inicial vazio da fila (evita recriar objetos a cada render). */
const EMPTY_QUEUE: PaymentQueue = {
  overdue: [],
  currentMonth: [],
  upcoming: [],
};

/**
 * Consome a fila de pagamentos pendentes do workspace autenticado.
 *
 * @param filters Filtros opcionais (month, year, paidById).
 * @returns Os agrupamentos de urgência, estados e função de refetch.
 *
 * @example
 * const { overdue, currentMonth, upcoming, isLoading, refetch } = usePaymentQueue();
 */
export function usePaymentQueue(
  filters?: PaymentQueueFilters,
): UsePaymentQueueResult {
  const [queue, setQueue] = useState<PaymentQueue>(EMPTY_QUEUE);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Serializa os filtros para estabilizar a dependência do efeito.
  const month = filters?.month;
  const year = filters?.year;
  const paidById = filters?.paidById;

  const fetchQueue = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await paymentItemsApi.queue({ month, year, paidById });
      setQueue(data);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Não foi possível carregar a fila de pagamentos.';
      setError(message);
      setQueue(EMPTY_QUEUE);
    } finally {
      setIsLoading(false);
    }
  }, [month, year, paidById]);

  useEffect(() => {
    void fetchQueue();
  }, [fetchQueue]);

  const totalPending = useMemo<number>(
    () =>
      queue.overdue.length +
      queue.currentMonth.length +
      queue.upcoming.length,
    [queue],
  );

  return {
    overdue: queue.overdue,
    currentMonth: queue.currentMonth,
    upcoming: queue.upcoming,
    totalPending,
    isEmpty: totalPending === 0,
    isLoading,
    error,
    refetch: fetchQueue,
  };
}
