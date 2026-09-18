/**
 * useDashboard.ts — Hooks de consumo do Painel Gerencial (TAREFAS 44, 45 e 46).
 *
 * Encapsula o fetch dos endpoints do dashboard:
 *  - GET /dashboard/summary → cards de resumo do mês (TAREFA 44).
 *  - GET /dashboard/category-distribution → distribuição por categoria,
 *    alimentando o gráfico de rosca (TAREFA 45).
 *  - GET /dashboard/monthly-evolution → evolução mensal de 12 meses,
 *    alimentando o gráfico de barras (TAREFA 46).
 *
 * RN-09: relatórios exclusivamente de saídas (sem receitas).
 * §8.2: valores trafegam como inteiros em centavos (Int); a conversão para
 *       exibição ocorre exclusivamente na camada de apresentação.
 * §8.1: proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import { useCallback, useEffect, useState } from 'react';

import {
  ApiError,
  dashboardApi,
  type CategoryDistribution,
  type DashboardSummary,
  type MonthlyEvolution,
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

/**
 * Filtros de período aceitos pela distribuição por categoria.
 */
export interface CategoryDistributionFilters {
  /** Mês de referência (1–12). */
  month: number;
  /** Ano de referência (ex: 2026). */
  year: number;
}

/**
 * Estado e operações expostos pelo hook useCategoryDistribution.
 */
export interface UseCategoryDistributionResult {
  /** Distribuição por categoria do mês, ou array vazio enquanto não carregado. */
  distribution: CategoryDistribution[];
  /** Indica se a requisição está em andamento. */
  isLoading: boolean;
  /** Mensagem de erro legível, ou null quando não há falha. */
  error: string | null;
  /** Recarrega a distribuição a partir da API. */
  refetch: () => Promise<void>;
}

/**
 * Consome a distribuição percentual de gastos por categoria do mês
 * (alimenta o gráfico de rosca — TAREFA 45).
 *
 * @param filters Período de referência (month, year).
 * @returns Distribuição por categoria, estados e função de refetch.
 *
 * @example
 * const { distribution, isLoading, error, refetch } = useCategoryDistribution({ month: 9, year: 2026 });
 */
export function useCategoryDistribution(
  filters: CategoryDistributionFilters,
): UseCategoryDistributionResult {
  const [distribution, setDistribution] = useState<CategoryDistribution[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { month, year } = filters;

  const fetchDistribution = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await dashboardApi.categoryDistribution({ month, year });
      setDistribution(data);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Não foi possível carregar a distribuição por categoria.';
      setError(message);
      setDistribution([]);
    } finally {
      setIsLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    void fetchDistribution();
  }, [fetchDistribution]);

  return {
    distribution,
    isLoading,
    error,
    refetch: fetchDistribution,
  };
}

/**
 * Filtros de período aceitos pela evolução mensal.
 */
export interface MonthlyEvolutionFilters {
  /** Ano de referência (ex: 2026). */
  year: number;
}

/**
 * Estado e operações expostos pelo hook useMonthlyEvolution.
 */
export interface UseMonthlyEvolutionResult {
  /** Evolução mensal do ano, ou array vazio enquanto não carregado. */
  evolution: MonthlyEvolution[];
  /** Indica se a requisição está em andamento. */
  isLoading: boolean;
  /** Mensagem de erro legível, ou null quando não há falha. */
  error: string | null;
  /** Recarrega a evolução mensal a partir da API. */
  refetch: () => Promise<void>;
}

/**
 * Consome a evolução mensal de despesas ao longo dos 12 meses do ano
 * (alimenta o gráfico de barras — TAREFA 46).
 *
 * RN-09: exclusivamente saídas (pago vs pendente). Meses sem dados retornam
 * zero, conforme contrato do endpoint GET /dashboard/monthly-evolution.
 *
 * @param filters Ano de referência (year).
 * @returns Evolução mensal, estados e função de refetch.
 *
 * @example
 * const { evolution, isLoading, error, refetch } = useMonthlyEvolution({ year: 2026 });
 */
export function useMonthlyEvolution(
  filters: MonthlyEvolutionFilters,
): UseMonthlyEvolutionResult {
  const [evolution, setEvolution] = useState<MonthlyEvolution[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { year } = filters;

  const fetchEvolution = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await dashboardApi.monthlyEvolution({ year });
      setEvolution(data);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Não foi possível carregar a evolução mensal.';
      setError(message);
      setEvolution([]);
    } finally {
      setIsLoading(false);
    }
  }, [year]);

  useEffect(() => {
    void fetchEvolution();
  }, [fetchEvolution]);

  return {
    evolution,
    isLoading,
    error,
    refetch: fetchEvolution,
  };
}
