/**
 * DashboardPage.tsx — Painel gerencial (TAREFA 37 placeholder).
 *
 * Exibe cards de resumo, gráfico de rosca por categoria e gráfico de barras
 * de evolução mensal. Conteúdo completo nas TAREFAS 44–46.
 */

import { PagePlaceholder } from '@/components/layout/PagePlaceholder';

/**
 * Página do Painel Gerencial (rota "/dashboard").
 */
export function DashboardPage(): JSX.Element {
  return (
    <PagePlaceholder
      title="Painel Gerencial"
      description="Total pago e a pagar no mês, divisão por membro e gráficos de saídas."
    />
  );
}
