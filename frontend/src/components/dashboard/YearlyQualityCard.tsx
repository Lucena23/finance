import { AlertCircle, RefreshCw } from 'lucide-react';
import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMonthlyEvolution } from '@/hooks/useDashboard';
import { formatCurrency, formatPercentage } from '@/lib/utils';

export function YearlyQualityCard({ year }: { year: number }): JSX.Element {
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
            Qualidade do Histórico - {year}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            role="status"
            aria-live="polite"
            className="bg-muted h-24 w-full animate-pulse rounded-md"
          >
            <span className="sr-only">Carregando consolidação anual...</span>
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
            Qualidade do Histórico - {year}
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
          Qualidade do Histórico - {year}
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
