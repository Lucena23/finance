/**
 * DashboardPage.tsx — Painel gerencial (TAREFA 44).
 *
 * Exibe os cards de resumo do mês (Total Pago, Total a Pagar e Divisão
 * Proporcional por Membro) através do componente <SummaryCards />, que
 * consome GET /dashboard/summary (RN-09 — exclusivamente saídas).
 *
 * Os gráficos de rosca (categoria) e barras (evolução mensal) são entregues
 * nas TAREFAS 45 e 46.
 */

import { useMemo } from 'react';

import { SummaryCards } from '@/components/dashboard/SummaryCards';
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
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight">Painel Gerencial</h1>
        <p className="text-muted-foreground text-sm">
          Total pago e a pagar no mês, divisão por membro e gráficos de saídas.
        </p>
      </header>

      <SummaryCards month={month} year={year} />
    </section>
  );
}
