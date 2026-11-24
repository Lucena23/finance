/**
 * DashboardPage.tsx - Painel gerencial unificado.
 *
 * Exibe os cards de resumo do mês, o gráfico de rosca de distribuição
 * por categoria, e o gráfico de barras de evolução mensal.
 * Além disso, consolida o componente YearlyQualityCard e o gerador
 * de relatórios PDF (ReportModal), centralizando a inteligência financeira.
 */

import { useState } from 'react';

import { CategoryDonut } from '@/components/dashboard/CategoryDonut';
import { MonthlyBars } from '@/components/dashboard/MonthlyBars';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { YearlyQualityCard } from '@/components/dashboard/YearlyQualityCard';
import { ReportModal } from '@/components/dashboard/ReportModal';
import {
  MonthCarousel,
  getPeriodForOffset,
} from '@/components/payment/MonthCarousel';
import { LockedMonthOverlay } from '@/components/plan/LockedMonthOverlay';
import { AnimatedAdBanner } from '@/components/ads/AnimatedAdBanner';
import { usePlan } from '@/contexts/PlanContext';

export function DashboardPage(): JSX.Element {
  const { canViewPeriod } = usePlan();
  const [monthOffset, setMonthOffset] = useState<number>(0);

  const { month: selectedMonth, year: selectedYear } =
    getPeriodForOffset(monthOffset);
  const isMonthUnlocked = canViewPeriod(selectedMonth, selectedYear);

  return (
    <section className="flex flex-col gap-5 pb-16">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold tracking-tight">Painel Gerencial</h1>
          <p className="text-muted-foreground text-sm">
            Total pago e a pagar no mês, divisão por membro e gráficos de saídas.
          </p>
        </div>

        {/* Modal de Gerar Relatório (Substitui antiga aba Relatórios) */}
        <ReportModal />
      </header>

      {/* Seletor de Meses unificado com a Fila (TAREFA 16) */}
      <MonthCarousel value={monthOffset} onSelect={setMonthOffset} />

      {!isMonthUnlocked ? (
        <>
          <LockedMonthOverlay
            month={selectedMonth}
            year={selectedYear}
            variant="dashboard"
            onBackToCurrentMonth={() => setMonthOffset(0)}
          />
          <div className="pt-2 pb-2">
            <AnimatedAdBanner type="rectangle" />
          </div>
        </>
      ) : (
        <>
          {/* Cartões do Mês Selecionado */}
          <SummaryCards month={selectedMonth} year={selectedYear} />

          {/* Banner de Ads animado - Medium Rectangle IAB 300x250 (TAREFA 19) */}
          <div className="pt-2 pb-2">
            <AnimatedAdBanner type="rectangle" />
          </div>

          {/* Qualidade do Histórico Anual */}
          <YearlyQualityCard year={selectedYear} />

          {/* Gráfico Rosca */}
          <CategoryDonut month={selectedMonth} year={selectedYear} />

          {/* Evolução Mensal */}
          <MonthlyBars year={selectedYear} />
        </>
      )}
    </section>
  );
}
