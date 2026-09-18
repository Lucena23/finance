/**
 * MonthlyBars.tsx — Gráfico de Barras de evolução mensal (TAREFA 46).
 *
 * Consome GET /dashboard/monthly-evolution (via useMonthlyEvolution) e
 * renderiza um gráfico de barras (Recharts) com a evolução das saídas ao
 * longo dos 12 meses do ano, comparando o total PAGO versus o total
 * PENDENTE (a pagar) em cada mês.
 *
 * RN-09: relatórios exclusivamente de saídas (sem receitas).
 * §8.2: valores trafegam em centavos (Int); a formatação para "R$ X.XXX,XX"
 *       ocorre exclusivamente na camada de apresentação (formatCurrency).
 * §8.1: proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import { AlertCircle, BarChart3, RefreshCw } from 'lucide-react';
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMonthlyEvolution } from '@/hooks/useDashboard';
import type { MonthlyEvolution } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface MonthlyBarsProps {
  /** Ano de referência (ex: 2026). */
  year: number;
}

/**
 * Rótulos abreviados dos meses (índice 0 = Janeiro).
 */
const MONTH_LABELS: readonly string[] = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

/**
 * Cores das séries do gráfico (pago = verde, pendente = laranja).
 */
const PAID_COLOR = '#10b981';
const PENDING_COLOR = '#f97316';

/**
 * Ponto de dados do gráfico de barras.
 */
interface MonthlyBarPoint {
  /** Rótulo abreviado do mês (ex: "Jan"). */
  label: string;
  /** Número do mês (1–12). */
  month: number;
  /** Total pago no mês, em centavos. */
  totalPaid: number;
  /** Total pendente (a pagar) no mês, em centavos. */
  totalPending: number;
}

/**
 * Converte a evolução mensal da API em pontos do gráfico, garantindo os 12
 * meses do ano (meses ausentes retornam zero — contrato do endpoint).
 */
function toBarPoints(evolution: MonthlyEvolution[]): MonthlyBarPoint[] {
  const byMonth = new Map<number, MonthlyEvolution>();

  for (const entry of evolution) {
    byMonth.set(entry.month, entry);
  }

  return MONTH_LABELS.map((label, index) => {
    const month = index + 1;
    const entry = byMonth.get(month);

    return {
      label,
      month,
      totalPaid: entry?.totalPaid ?? 0,
      totalPending: entry?.totalPending ?? 0,
    };
  });
}

/**
 * Tooltip customizado exibindo o mês, o total pago e o total pendente,
 * ambos formatados via formatCurrency (§8.2).
 */
function MonthlyBarsTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>): JSX.Element | null {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const point = payload[0]?.payload as MonthlyBarPoint | undefined;

  if (!point) {
    return null;
  }

  return (
    <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      <p className="flex items-center gap-2 tabular-nums">
        <span
          aria-hidden="true"
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: PAID_COLOR }}
        />
        Pago: {formatCurrency(point.totalPaid)}
      </p>
      <p className="flex items-center gap-2 tabular-nums">
        <span
          aria-hidden="true"
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: PENDING_COLOR }}
        />
        A pagar: {formatCurrency(point.totalPending)}
      </p>
    </div>
  );
}

/**
 * Formata o eixo Y exibindo valores compactos em reais (ex: "R$ 1,2 mil").
 */
function formatAxisValue(centavos: number): string {
  const reais = centavos / 100;

  if (reais >= 1000) {
    return `R$ ${(reais / 1000).toLocaleString('pt-BR', {
      maximumFractionDigits: 1,
    })} mil`;
  }

  return `R$ ${reais.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
}

/**
 * Gráfico de Barras (Recharts) com a evolução mensal de saídas ao longo dos
 * 12 meses do ano, comparando total pago versus total a pagar.
 */
export function MonthlyBars({ year }: MonthlyBarsProps): JSX.Element {
  const { evolution, isLoading, error, refetch } = useMonthlyEvolution({ year });

  const points = useMemo(() => toBarPoints(evolution), [evolution]);

  const hasData = useMemo(
    () =>
      points.some(
        (point) => point.totalPaid > 0 || point.totalPending > 0,
      ),
    [points],
  );

  // ── Estado de carregamento ────────────────────────────────────────────
  if (isLoading) {
    return (
      <Card data-testid="monthly-bars-loading">
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Evolução Mensal (12 meses)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            role="status"
            aria-live="polite"
            className="bg-muted h-64 w-full animate-pulse rounded-md"
          >
            <span className="sr-only">Carregando evolução mensal…</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Estado de erro ────────────────────────────────────────────────────
  if (error) {
    return (
      <Card
        role="alert"
        className="border-destructive/40"
        data-testid="monthly-bars-error"
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Evolução Mensal (12 meses)
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

  // ── Estado vazio ──────────────────────────────────────────────────────
  if (!hasData) {
    return (
      <Card data-testid="monthly-bars-empty">
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Evolução Mensal (12 meses)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
          <BarChart3
            aria-hidden="true"
            className="text-muted-foreground h-8 w-8"
          />
          <p className="text-muted-foreground text-sm">
            Nenhuma despesa registrada em {year}.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Gráfico de barras ─────────────────────────────────────────────────
  return (
    <Card data-testid="monthly-bars">
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">
          Evolução Mensal (12 meses)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full" data-testid="monthly-bars-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={points}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                fontSize={12}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={12}
                width={64}
                tickFormatter={formatAxisValue}
              />
              <Tooltip
                cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }}
                content={<MonthlyBarsTooltip />}
              />
              <Legend
                verticalAlign="top"
                height={28}
                iconType="circle"
                formatter={(value: string) => (
                  <span className="text-muted-foreground text-xs">{value}</span>
                )}
              />
              <Bar
                dataKey="totalPaid"
                name="Pago"
                fill={PAID_COLOR}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
              <Bar
                dataKey="totalPending"
                name="A pagar"
                fill={PENDING_COLOR}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
