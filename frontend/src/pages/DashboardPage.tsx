/**
 * DashboardPage.tsx - Painel gerencial unificado.
 *
 * Exibe os cards de resumo do mês, o gráfico de rosca de distribuição
 * por categoria, e o gráfico de barras de evolução mensal.
 * Além disso, consolida o componente YearlyQualityCard e o gerador
 * de relatórios PDF (ReportModal), centralizando a inteligência financeira.
 */

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';

import { cn } from '@/lib/cn';
import { CategoryDonut } from '@/components/dashboard/CategoryDonut';
import { MonthlyBars } from '@/components/dashboard/MonthlyBars';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { YearlyQualityCard } from '@/components/dashboard/YearlyQualityCard';
import { ReportModal } from '@/components/dashboard/ReportModal';
import { LockedMonthOverlay } from '@/components/plan/LockedMonthOverlay';
import { AnimatedAdBanner } from '@/components/ads/AnimatedAdBanner';
import { usePlan } from '@/contexts/PlanContext';
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
  const { showGoldCue, isFreeAllowedPeriod, canViewPeriod } = usePlan();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(month);

  const monthsList = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];

  const handlePreviousYear = () => setSelectedYear((v) => v - 1);
  const handleNextYear = () => setSelectedYear((v) => Math.min(currentYear + 1, v + 1));

  const isCurrentYear = selectedYear >= currentYear;
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

      {/* Seletor de Mês */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
        {monthsList.map((mName, idx) => {
          const mNum = idx + 1;
          const isSelected = selectedMonth === mNum;
          const isGoldMonth =
            showGoldCue && !isFreeAllowedPeriod(mNum, selectedYear);

          return (
            <button
              key={mNum}
              type="button"
              onClick={() => setSelectedMonth(mNum)}
              className={cn(
                'inline-flex items-center gap-1 px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap snap-center transition-colors focus:outline-none',
                isSelected
                  ? isGoldMonth
                    ? 'border border-amber-400 bg-gradient-to-r from-amber-400 to-yellow-500 font-bold text-slate-950'
                    : 'bg-primary text-primary-foreground'
                  : isGoldMonth
                    ? 'border border-amber-400/45 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              )}
            >
              {isGoldMonth && (
                <Lock
                  aria-hidden="true"
                  className={cn(
                    'h-3 w-3 shrink-0',
                    isSelected ? 'text-slate-950' : 'text-amber-400',
                  )}
                />
              )}
              {mName}
            </button>
          );
        })}
      </div>

      {!isMonthUnlocked ? (
        <>
          <LockedMonthOverlay
            month={selectedMonth}
            year={selectedYear}
            variant="dashboard"
            onBackToCurrentMonth={() => {
              setSelectedMonth(month);
              setSelectedYear(currentYear);
            }}
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
