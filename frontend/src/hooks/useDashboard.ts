/**
 * useDashboard.ts — Hook de consumo do Painel Gerencial (TAREFA 44).
 *
 * Encapsula o fetch de GET /dashboard/summary, expondo os cards de resumo do
 * mês (Total Pago, Total a Pagar e Divisão Proporcional por Membro) já
 * agregados pelo backend (RN-09 — relatórios exclusivamente de saídas).
 *
 * Os valores trafegam como inteiros em centavos (Int — §8.2); a conversão
 * para exibição ocorre exclusivamente na camada de apresentação.
 *
 * REGRA (§8.1): proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import { useCallback, useEffect, useState } from 'react';

import {
  ApiError,
  dashboardApi,
  type DashboardSummary,
} from '@/lib/api';

/**
 * Filtros de período aceitos pelo resumo do dashboard.
 */
export interface DashboardSummaryFilters {
  /** Mês de referência (1–12). */
  month: number;
  /** Ano de referência (ex: 2026). */
  year: number;
}

/**
 * Estado e operações expostos pelo hook useDashboardSummary.
 */
export interface UseDashboardSummaryResult {
  /** Resumo agregado do mês, ou null enquanto não carregado. */
  summary: DashboardSummary | null;
  /** Indica se a requisição está em andamento. */
  isLoading: boolean;
  /** Mensagem de erro legível, ou null quando não há falha. */
  error: string | null;
  /** Recarrega o resumo a partir da API. */
  refetch: () => Promise<void>;
}

/**
 * Consome o resumo mensal do painel gerencial do workspace autenticado.
 *
 * @param filters Período de referência (month, year).
 * @returns Resumo agregado, estados e função de refetch.
 *
 * @example
 * const { summary, isLoading, error, refetch } = useDashboardSummary({ month: 9, year: 2026 });
 */
export function useDashboardSummary(
  filters: DashboardSummaryFilters,
): UseDashboardSummaryResult {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { month, year } = filters;

  const fetchSummary = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await dashboardApi.summary({ month, year });
      setSummary(data);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Não foi possível carregar o resumo do painel.';
      setError(message);
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  return {
    summary,
    isLoading,
    error,
    refetch: fetchSummary,
  };
}
