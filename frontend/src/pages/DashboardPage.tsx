/**
 * DashboardPage.tsx - Painel gerencial unificado.
 *
 * Exibe os cards de resumo do mês, o gráfico de rosca de distribuição
 * por categoria, e o gráfico de barras de evolução mensal.
 * Além disso, consolida o componente YearlyQualityCard e o gerador
 * de relatórios PDF (ReportModal), centralizando a inteligência financeira.
 */

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/cn';
import { CategoryDonut } from '@/components/dashboard/CategoryDonut';
import { MonthlyBars } from '@/components/dashboard/MonthlyBars';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { YearlyQualityCard } from '@/components/dashboard/YearlyQualityCard';
import { ReportModal } from '@/components/dashboard/ReportModal';
import { AnimatedAdBanner } from '@/components/ads/AnimatedAdBanner';
import { DEFAULT_TIMEZONE } from '@/lib/constants';

/**
 * Retorna o mês e o ano correntes no fuso America/Sao_Paulo.
 */
function currentPeriod(): { month: number; year: number } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: DEFAULT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
  });

  const [yearPart, monthPart] = formatter.format(new Date()).split('-');

  return {
    month: Number(monthPart),
    year: Number(yearPart),
  };
}

export function DashboardPage(): JSX.Element {
  const { month, year: currentYear } = useMemo(currentPeriod, []);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const handlePreviousYear = () => setSelectedYear((v) => v - 1);
  const handleNextYear = () => setSelectedYear((v) => Math.min(currentYear, v + 1));

  const isCurrentYear = selectedYear === currentYear;

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

      {/* Seletor de ano (Trazido da antiga página de relatórios) */}
      <div className="flex items-center justify-between gap-2" data-testid="dashboard-year-selector">
        <button
          type="button"
          onClick={handlePreviousYear}
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border',
            'text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <span className="text-base font-bold tabular-nums">
          {selectedYear}
        </span>

        <button
          type="button"
          onClick={handleNextYear}
          disabled={isCurrentYear}
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border',
            'text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
            'disabled:pointer-events-none disabled:opacity-40'
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Cartões do Mês Selecionado */}
      <SummaryCards month={month} year={selectedYear} />

      {/* Qualidade do Histórico Anual */}
      <YearlyQualityCard year={selectedYear} />

      {/* Gráfico Rosca */}
      <CategoryDonut month={month} year={selectedYear} />

      {/* Evolução Mensal */}
      <MonthlyBars year={selectedYear} />

      {/* Banner de Ads animado - Medium Rectangle IAB 300x250 */}
      <div className="pt-4 pb-8">
        <AnimatedAdBanner type="rectangle" />
      </div>
    </section>
  );
}
