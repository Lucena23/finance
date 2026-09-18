/**
 * useExpenses.ts — Hook de gestão de despesas (TAREFA 42).
 *
 * Encapsula o consumo de GET /expenses e as operações de criação, edição,
 * exclusão lógica (soft delete — RN-11) e restauração, além do encerramento
 * de recorrência (RN-05 / §8.4). Expõe estados de carregamento, erro e
 * refetch manual para as telas de despesas.
 *
 * REGRA (§8.1): proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import { useCallback, useEffect, useState } from 'react';

import { ApiError, expensesApi, type Expense } from '@/lib/api';
import type { ExpenseType } from '@/lib/constants';

/**
 * Filtros opcionais aceitos pela listagem de despesas.
 */
export interface ExpenseFilters {
  /** Filtra por tipo de despesa. */
  type?: ExpenseType;
  /** Filtra por categoria. */
  categoryId?: string;
}

/**
 * Estado e operações expostos pelo hook useExpenses.
 */
export interface UseExpensesResult {
  /** Despesas ativas do workspace (deletedAt = NULL). */
  expenses: Expense[];
  /** Total de despesas retornadas pela API. */
  total: number;
  /** Indica se a listagem está carregando. */
  isLoading: boolean;
  /** Mensagem de erro legível, ou null quando não há falha. */
  error: string | null;
  /** Recarrega a listagem a partir da API. */
  refetch: () => Promise<void>;
  /** Remove logicamente uma despesa (soft delete). */
  remove: (id: string) => Promise<void>;
  /** Restaura uma despesa previamente excluída. */
  restore: (id: string) => Promise<void>;
  /** Encerra a recorrência de uma despesa RECURRENT. */
  cancelRecurrence: (id: string) => Promise<void>;
}

/**
 * Consome e gerencia as despesas do workspace autenticado.
 *
 * @param filters Filtros opcionais (type, categoryId).
 * @returns Lista de despesas, estados e operações de mutação.
 *
 * @example
 * const { expenses, isLoading, remove, restore } = useExpenses();
 */
export function useExpenses(filters?: ExpenseFilters): UseExpensesResult {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const type = filters?.type;
  const categoryId = filters?.categoryId;

  const fetchExpenses = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await expensesApi.list({ type, categoryId });
      setExpenses(response.data);
      setTotal(response.total);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Não foi possível carregar as despesas.';
      setError(message);
      setExpenses([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [type, categoryId]);

  useEffect(() => {
    void fetchExpenses();
  }, [fetchExpenses]);

  const remove = useCallback(
    async (id: string): Promise<void> => {
      await expensesApi.remove(id);
      await fetchExpenses();
    },
    [fetchExpenses],
  );

  const restore = useCallback(
    async (id: string): Promise<void> => {
      await expensesApi.restore(id);
      await fetchExpenses();
    },
    [fetchExpenses],
  );

  const cancelRecurrence = useCallback(
    async (id: string): Promise<void> => {
      await expensesApi.cancelRecurrence(id);
      await fetchExpenses();
    },
    [fetchExpenses],
  );

  return {
    expenses,
    total,
    isLoading,
    error,
    refetch: fetchExpenses,
    remove,
    restore,
    cancelRecurrence,
  };
}
