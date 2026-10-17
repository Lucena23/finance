/**
 * useAdmin.ts — Hooks de consumo do Painel Aksurim (Admin Global).
 *
 * TAREFA 28 / RN-15: encapsula o fetch das rotas globais cross-tenant do
 * backend (`/admin/metrics`, `/admin/leads`, `/admin/leads/export`).
 *
 * IMPORTANTE (RN-15): estas rotas exigem `isGlobalAdmin === true` no JWT
 * (GlobalAdminGuard no backend). Role.ADMIN (chefe de família) NÃO tem acesso.
 * O frontend apenas condiciona a EXIBIÇÃO da aba; a autorização real é
 * sempre validada no backend — nunca confiar apenas na flag do cliente.
 *
 * §8.2: valores monetários trafegam como inteiros em centavos (Int); a
 *       conversão para exibição ocorre exclusivamente na apresentação.
 * §8.1: proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import { useCallback, useEffect, useState } from 'react';

import {
  ApiError,
  adminApi,
  type AdminGlobalMetrics,
  type AdminLead,
  type UpdateFamilyPlanPayload,
  type LeadExportFormat,
} from '@/lib/api';

/**
 * Estado e operações expostos pelo hook useAdminMetrics.
 */
export interface UseAdminMetricsResult {
  /** Métricas globais, ou null enquanto não carregadas. */
  metrics: AdminGlobalMetrics | null;
  /** Indica se a requisição está em andamento. */
  isLoading: boolean;
  /** Mensagem de erro legível, ou null quando não há falha. */
  error: string | null;
  /** Recarrega as métricas a partir da API. */
  refetch: () => Promise<void>;
}

/**
 * Consome as métricas globais do Painel Aksurim (total de clientes, ativos
 * por período e volumes financeiros agregados).
 *
 * @returns Métricas globais, estados e função de refetch.
 *
 * @example
 * const { metrics, isLoading, error, refetch } = useAdminMetrics();
 */
export function useAdminMetrics(): UseAdminMetricsResult {
  const [metrics, setMetrics] = useState<AdminGlobalMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await adminApi.metrics();
      setMetrics(data);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Não foi possível carregar as métricas globais.';
      setError(message);
      setMetrics(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMetrics();
  }, [fetchMetrics]);

  return {
    metrics,
    isLoading,
    error,
    refetch: fetchMetrics,
  };
}

/**
 * Estado e operações expostos pelo hook useAdminLeads.
 */
export interface UseAdminLeadsResult {
  /** Lista de leads comerciais (CPF mascarado), ou array vazio. */
  leads: AdminLead[];
  /** Indica se a requisição está em andamento. */
  isLoading: boolean;
  /** Mensagem de erro legível, ou null quando não há falha. */
  error: string | null;
  /** Indica se uma exportação está em andamento. */
  isExporting: boolean;
  /** ID da família em atualização de plano no momento. */
  updatingFamilyId: string | null;
  /** Recarrega a lista de leads a partir da API. */
  refetch: () => Promise<void>;
  /** Exporta os leads no formato informado (pdf | csv). */
  exportLeads: (format: LeadExportFormat) => Promise<void>;
  /** Atualiza manualmente o plano de uma família (Premium / Trial / Free). */
  updateFamilyPlan: (
    familyId: string,
    payload: UpdateFamilyPlanPayload,
  ) => Promise<void>;
}

/**
 * Consome a lista de leads comerciais e expõe a exportação (PDF/CSV).
 *
 * @returns Leads, estados e operações de refetch/exportação.
 *
 * @example
 * const { leads, isLoading, exportLeads } = useAdminLeads();
 */
export function useAdminLeads(): UseAdminLeadsResult {
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [updatingFamilyId, setUpdatingFamilyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await adminApi.leads();
      setLeads(data);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Não foi possível carregar a lista de leads.';
      setError(message);
      setLeads([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLeads();
  }, [fetchLeads]);

  const exportLeads = useCallback(
    async (format: LeadExportFormat): Promise<void> => {
      setIsExporting(true);
      setError(null);

      try {
        await adminApi.exportLeads(format);
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : 'Não foi possível exportar os leads. Tente novamente.';
        setError(message);
      } finally {
        setIsExporting(false);
      }
    },
    [],
  );

  const updateFamilyPlan = useCallback(
    async (
      familyId: string,
      payload: UpdateFamilyPlanPayload,
    ): Promise<void> => {
      setUpdatingFamilyId(familyId);
      setError(null);

      try {
        await adminApi.updateFamilyPlan(familyId, payload);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('plan-updated'));
        }
        await fetchLeads();
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : 'Não foi possível atualizar o plano da família.';
        setError(message);
      } finally {
        setUpdatingFamilyId(null);
      }
    },
    [fetchLeads],
  );

  return {
    leads,
    isLoading,
    isExporting,
    updatingFamilyId,
    error,
    refetch: fetchLeads,
    exportLeads,
    updateFamilyPlan,
  };
}
