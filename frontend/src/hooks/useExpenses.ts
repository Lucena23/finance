/**
 * useExpenses.ts — Hook de gestão de despesas (TAREFA 42 / TAREFA 15).
 *
 * Encapsula o consumo de GET /expenses e as operações de criação, edição,
 * exclusão lógica (soft delete — RN-11) e restauração, além do encerramento
 * de recorrência (RN-05 / §8.4). Expõe estados de carregamento, erro e
 * refetch manual para as telas de despesas.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * TAREFA 15 — Loading Spinners e atualizações otimistas no CRUD
 * ─────────────────────────────────────────────────────────────────────────
 * As mutações (remove/restore/cancelRecurrence) agora aplicam **atualização
 * otimista**: o estado local é alterado imediatamente (feedback instantâneo
 * na UI) e, em caso de falha da API, é feito **rollback** para o snapshot
 * anterior. Isso elimina a percepção de "demora/congelamento" causada pelo
 * refetch completo a cada ação.
 *
 * O hook também expõe `pendingIds` (Set de ids em operação) para que os
 * cards exibam spinners individuais enquanto a requisição está em voo, sem
 * bloquear a interação com os demais itens.
 *
 * REGRA (§8.1): proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

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
  /** Ids de despesas com operação de mutação em andamento (spinners). */
  pendingIds: ReadonlySet<string>;
  /** Recarrega a listagem a partir da API. */
  refetch: () => Promise<void>;
  /** Remove logicamente uma despesa (soft delete) — otimista. */
  remove: (id: string) => Promise<void>;
  /** Restaura uma despesa previamente excluída — otimista. */
  restore: (id: string) => Promise<void>;
  /** Encerra a recorrência de uma despesa RECURRENT — otimista. */
  cancelRecurrence: (id: string) => Promise<void>;
}

/**
 * Consome e gerencia as despesas do workspace autenticado.
 *
 * @param filters Filtros opcionais (type, categoryId).
 * @returns Lista de despesas, estados e operações de mutação.
 *
 * @example
 * const { expenses, isLoading, pendingIds, remove, restore } = useExpenses();
 */
export function useExpenses(filters?: ExpenseFilters): UseExpensesResult {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );

  // Snapshot do estado anterior para rollback em caso de falha otimista.
  const snapshotRef = useRef<Expense[]>([]);

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

  /**
   * Marca/desmarca um id como "em operação" (controla spinners por card).
   */
  const setPending = useCallback((id: string, isPending: boolean): void => {
    setPendingIds((current) => {
      const next = new Set(current);
      if (isPending) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  /**
   * Executa uma mutação otimista com rollback automático.
   *
   * @param id Id da despesa alvo.
   * @param optimistic Aplica a mudança otimista no estado local.
   * @param request A chamada real à API.
   */
  const runOptimistic = useCallback(
    async (
      id: string,
      optimistic: (current: Expense[]) => Expense[],
      request: () => Promise<unknown>,
    ): Promise<void> => {
      // Guarda o snapshot para rollback.
      snapshotRef.current = expenses;
      setError(null);
      setPending(id, true);

      // Atualização otimista imediata (feedback instantâneo).
      setExpenses((current) => optimistic(current));

      try {
        await request();
      } catch (err) {
        // Rollback para o estado anterior em caso de falha.
        setExpenses(snapshotRef.current);
        const message =
          err instanceof ApiError
            ? err.message
            : 'Não foi possível concluir a operação.';
        setError(message);
        throw err;
      } finally {
        setPending(id, false);
      }
    },
    [expenses, setPending],
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      await runOptimistic(
        id,
        (current) =>
          current.map((expense) =>
            expense.id === id
              ? { ...expense, deletedAt: new Date().toISOString() }
              : expense,
          ),
        () => expensesApi.remove(id),
      );
    },
    [runOptimistic],
  );

  const restore = useCallback(
    async (id: string): Promise<void> => {
      await runOptimistic(
        id,
        (current) =>
          current.map((expense) =>
            expense.id === id ? { ...expense, deletedAt: null } : expense,
          ),
        () => expensesApi.restore(id),
      );
    },
    [runOptimistic],
  );

  const cancelRecurrence = useCallback(
    async (id: string): Promise<void> => {
      await runOptimistic(
        id,
        (current) =>
          current.map((expense) =>
            expense.id === id
              ? { ...expense, statusRecurrence: 'CANCELLED' as const }
              : expense,
          ),
        () => expensesApi.cancelRecurrence(id),
      );
    },
    [runOptimistic],
  );

  return {
    expenses,
    total,
    isLoading,
    error,
    pendingIds,
    refetch: fetchExpenses,
    remove,
    restore,
    cancelRecurrence,
  };
}
