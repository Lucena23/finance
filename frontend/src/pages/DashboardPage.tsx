/**
 * DashboardPage.tsx — Painel gerencial (TAREFAS 44, 45 e 46).
 *
 * Exibe os cards de resumo do mês (Total Pago, Total a Pagar e Divisão
 * Proporcional por Membro) através do componente <SummaryCards />, que
 * consome GET /dashboard/summary (RN-09 — exclusivamente saídas), o
 * gráfico de rosca de distribuição por categoria (<CategoryDonut />), que
 * consome GET /dashboard/category-distribution, e o gráfico de barras de
 * evolução mensal (<MonthlyBars />), que consome GET /dashboard/monthly-evolution.
 */

import { useMemo } from 'react';

import { CategoryDonut } from '@/components/dashboard/CategoryDonut';
import { MonthlyBars } from '@/components/dashboard/MonthlyBars';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { AdBanner } from '@/components/ads/AdBanner';
import { DEFAULT_TIMEZONE } from '@/lib/constants';

/**
 * Retorna o mês e o ano correntes no fuso America/Sao_Paulo (BRT/BRST — §8.11).
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

/**
 * Página do Painel Gerencial (rota "/dashboard").
 */
export function DashboardPage(): JSX.Element {
  const { month, year } = useMemo(currentPeriod, []);

  return (
    <section className="flex flex-col gap-4 pb-16">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight">Painel Gerencial</h1>
        <p className="text-muted-foreground text-sm">
          Total pago e a pagar no mês, divisão por membro e gráficos de saídas.
        </p>
      </header>

      <SummaryCards month={month} year={year} />
      
      <div className="py-2">
        <AdBanner type="leaderboard" className="mb-2" />
      </div>

      <CategoryDonut month={month} year={year} />

      <MonthlyBars year={year} />
      
      <div className="pt-4 pb-8">
        <AdBanner type="rectangle" />
      </div>
    </section>
  );
}
