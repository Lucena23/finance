/**
 * ReportsPage.tsx — Tela dedicada de Relatórios (TAREFA 17).
 *
 * Consolida o histórico financeiro de qualidade do workspace familiar:
 *  - Seletor de ano (carrossel de anos) para navegar entre exercícios.
 *  - Cards de resumo do mês de referência (Total Pago / a Pagar / Divisão
 *    por Membro) via GET /dashboard/summary.
 *  - Distribuição por categoria (gráfico de rosca) via
 *    GET /dashboard/category-distribution.
 *  - Evolução mensal de 12 meses (gráfico de barras) via
 *    GET /dashboard/monthly-evolution.
 *  - Bloco de "Qualidade do Histórico": consolidação anual (total pago,
 *    total a pagar e taxa de quitação) derivada da evolução mensal.
 *
 * ISOLAMENTO MULTI-TENANT (§8.3 / RN-01):
 *  Todas as consultas são feitas aos endpoints do dashboard, cujo
 *  `familyAccountId` é derivado EXCLUSIVAMENTE do JWT pelo
 *  FamilyScopeInterceptor no backend. Nenhum `familyAccountId` é enviado
 *  como parâmetro de query/body — o escopo é sempre derivado do token.
 *
 * RN-09: relatórios exclusivamente de saídas (sem receitas).
 * §8.2: valores trafegam em centavos (Int); a formatação para "R$ X.XXX,XX"
 *       ocorre exclusivamente na camada de apresentação (formatCurrency).
 * §8.1: proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import { AlertCircle, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { CategoryDonut } from '@/components/dashboard/CategoryDonut';
import { MonthlyBars } from '@/components/dashboard/MonthlyBars';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMonthlyEvolution } from '@/hooks/useDashboard';
import { cn } from '@/lib/cn';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import { formatCurrency, formatPercentage } from '@/lib/utils';

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
 * Bloco de consolidação anual ("Qualidade do Histórico").
 *
 * Deriva, a partir da evolução mensal (12 meses), os totais anuais de saídas
 * pagas e a pagar, além da taxa de quitação do exercício. Valores em centavos
 * (Int) — §8.2.
 */
function YearlyQualityCard({ year }: { year: number }): JSX.Element {
  const { evolution, isLoading, error, refetch } = useMonthlyEvolution({ year });

  const totals = useMemo(() => {
    const totalPaid = evolution.reduce((sum, entry) => sum + entry.totalPaid, 0);
    const totalPending = evolution.reduce(
      (sum, entry) => sum + entry.totalPending,
      0,
    );
    const grandTotal = totalPaid + totalPending;
    const settlementRate = grandTotal > 0 ? (totalPaid / grandTotal) * 100 : 0;

    return { totalPaid, totalPending, grandTotal, settlementRate };
  }, [evolution]);

  if (isLoading) {
    return (
      <Card data-testid="yearly-quality-loading">
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Qualidade do Histórico — {year}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            role="status"
            aria-live="polite"
            className="bg-muted h-24 w-full animate-pulse rounded-md"
          >
            <span className="sr-only">Carregando consolidação anual…</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card
        role="alert"
        className="border-destructive/40"
        data-testid="yearly-quality-error"
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Qualidade do Histórico — {year}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
          <AlertCircle aria-hidden="true" className="text-destructive h-8 w-8" />
          <p className="text-sm font-medium">{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
          >
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="yearly-quality">
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">
          Qualidade do Histórico — {year}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground text-xs">Total pago no ano</dt>
            <dd
              className="text-lg font-bold tabular-nums text-emerald-500"
              data-testid="yearly-total-paid"
            >
              {formatCurrency(totals.totalPaid)}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground text-xs">Total a pagar</dt>
            <dd
              className="text-lg font-bold tabular-nums text-orange-500"
              data-testid="yearly-total-pending"
            >
              {formatCurrency(totals.totalPending)}
            </dd>
          </div>
        </dl>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Taxa de quitação</span>
            <span
              className="font-semibold tabular-nums"
              data-testid="yearly-settlement-rate"
            >
              {formatPercentage(totals.settlementRate)}
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={Math.round(totals.settlementRate)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Taxa de quitação do ano"
            className="bg-muted h-2 w-full overflow-hidden rounded-full"
          >
            <div
              className="bg-primary h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, totals.settlementRate)}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Página de Relatórios (rota "/reports").
 *
 * Reúne o histórico financeiro de qualidade do workspace com navegação por
 * ano e gráficos analíticos. Todas as consultas respeitam o isolamento
 * multi-tenant (§8.3) — o escopo familiar é derivado do JWT no backend.
 */
export function ReportsPage(): JSX.Element {
  const { month, year: currentYear } = useMemo(currentPeriod, []);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const handlePreviousYear = useCallback((): void => {
    setSelectedYear((value) => value - 1);
  }, []);

  const handleNextYear = useCallback((): void => {
    setSelectedYear((value) => Math.min(currentYear, value + 1));
  }, [currentYear]);

  const isCurrentYear = selectedYear === currentYear;

  return (
    <section className="flex flex-col gap-5 pb-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground text-sm">
          Histórico financeiro de qualidade, informações de meses e anos
          anteriores e gráficos analíticos de saídas.
        </p>

        {/* Seletor de ano */}
        <div
          className="flex items-center justify-between gap-2"
          data-testid="reports-year-selector"
        >
          <button
            type="button"
            aria-label="Ano anterior"
            onClick={handlePreviousYear}
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border',
              'text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </button>

          <span
            className="text-base font-bold tabular-nums"
            aria-live="polite"
            data-testid="reports-selected-year"
          >
            {selectedYear}
          </span>

          <button
            type="button"
            aria-label="Próximo ano"
            onClick={handleNextYear}
            disabled={isCurrentYear}
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border',
              'text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:pointer-events-none disabled:opacity-40',
            )}
          >
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Resumo do mês de referência (mês corrente do ano selecionado) */}
      <SummaryCards month={month} year={selectedYear} />

      {/* Consolidação anual — qualidade do histórico */}
      <YearlyQualityCard year={selectedYear} />

      {/* Distribuição por categoria (rosca) */}
      <CategoryDonut month={month} year={selectedYear} />

      {/* Evolução mensal (barras) */}
      <MonthlyBars year={selectedYear} />
    </section>
  );
}
