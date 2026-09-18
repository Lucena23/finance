/**
 * CategoryDonut.tsx — Gráfico de Rosca de distribuição por categoria (TAREFA 45).
 *
 * Consome GET /dashboard/category-distribution (via useCategoryDistribution) e
 * renderiza um gráfico de rosca (Recharts) com as cores cadastradas de cada
 * categoria e os percentuais de participação no total de saídas do mês.
 *
 * RN-09: relatórios exclusivamente de saídas (sem receitas).
 * §8.2: valores trafegam em centavos (Int); a formatação para "R$ X.XXX,XX"
 *       ocorre exclusivamente na camada de apresentação (formatCurrency).
 * §8.1: proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import { AlertCircle, PieChart, RefreshCw } from 'lucide-react';
import { useMemo } from 'react';
import {
  Cell,
  Legend,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
} from 'recharts';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCategoryDistribution } from '@/hooks/useDashboard';
import type { CategoryDistribution } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatCurrency, formatPercentage } from '@/lib/utils';

interface CategoryDonutProps {
  /** Mês de referência (1–12). */
  month: number;
  /** Ano de referência (ex: 2026). */
  year: number;
}

/**
 * Payload de cada fatia do gráfico de rosca.
 */
interface DonutSlice {
  categoryId: string;
  name: string;
  color: string;
  totalAmount: number;
  percentage: number;
}

/**
 * Converte a distribuição da API em fatias do gráfico.
 */
function toSlices(distribution: CategoryDistribution[]): DonutSlice[] {
  return distribution.map((entry) => ({
    categoryId: entry.categoryId,
    name: entry.name,
    color: entry.color,
    totalAmount: entry.totalAmount,
    percentage: entry.percentage,
  }));
}

/**
 * Tooltip customizado exibindo nome da categoria, valor formatado e percentual.
 */
function DonutTooltip({
  active,
  payload,
}: TooltipProps<number, string>): JSX.Element | null {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const slice = payload[0]?.payload as DonutSlice | undefined;

  if (!slice) {
    return null;
  }

  return (
    <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 text-xs shadow-md">
      <p className="mb-1 flex items-center gap-2 font-medium">
        <span
          aria-hidden="true"
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: slice.color }}
        />
        {slice.name}
      </p>
      <p className="tabular-nums">{formatCurrency(slice.totalAmount)}</p>
      <p className="text-muted-foreground tabular-nums">
        {formatPercentage(slice.percentage)}
      </p>
    </div>
  );
}

/**
 * Legenda customizada com cor, nome e percentual de cada categoria.
 */
function DonutLegend({ slices }: { slices: DonutSlice[] }): JSX.Element {
  return (
    <ul className="mt-2 flex flex-col gap-2" data-testid="category-donut-legend">
      {slices.map((slice) => (
        <li
          key={slice.categoryId}
          className="flex items-center justify-between gap-3 text-sm"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: slice.color }}
            />
            <span className="truncate">{slice.name}</span>
          </span>
          <span className="text-muted-foreground shrink-0 tabular-nums">
            {formatPercentage(slice.percentage)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Gráfico de Rosca (Recharts) com a distribuição percentual de saídas por
 * categoria no mês de referência.
 */
export function CategoryDonut({ month, year }: CategoryDonutProps): JSX.Element {
  const { distribution, isLoading, error, refetch } = useCategoryDistribution({
    month,
    year,
  });

  const slices = useMemo(() => toSlices(distribution), [distribution]);

  const totalAmount = useMemo(
    () => slices.reduce((sum, slice) => sum + slice.totalAmount, 0),
    [slices],
  );

  // ── Estado de carregamento ────────────────────────────────────────────
  if (isLoading) {
    return (
      <Card data-testid="category-donut-loading">
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Distribuição por Categoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            role="status"
            aria-live="polite"
            className="bg-muted mx-auto h-56 w-56 animate-pulse rounded-full"
          >
            <span className="sr-only">
              Carregando distribuição por categoria…
            </span>
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
        data-testid="category-donut-error"
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Distribuição por Categoria
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
  if (slices.length === 0) {
    return (
      <Card data-testid="category-donut-empty">
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Distribuição por Categoria
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
          <PieChart
            aria-hidden="true"
            className="text-muted-foreground h-8 w-8"
          />
          <p className="text-muted-foreground text-sm">
            Nenhuma despesa registrada neste mês.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Gráfico de rosca ──────────────────────────────────────────────────
  return (
    <Card data-testid="category-donut">
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">
          Distribuição por Categoria
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full" data-testid="category-donut-chart">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Pie
                data={slices}
                dataKey="totalAmount"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="80%"
                paddingAngle={2}
                stroke="none"
                isAnimationActive={false}
              >
                {slices.map((slice) => (
                  <Cell key={slice.categoryId} fill={slice.color} />
                ))}
              </Pie>
              <Tooltip content={<DonutTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={0}
                content={() => <DonutLegend slices={slices} />}
              />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>

        <p
          className={cn(
            'text-muted-foreground mt-3 text-center text-xs tabular-nums',
          )}
          data-testid="category-donut-total"
        >
          Total de saídas no mês: {formatCurrency(totalAmount)}
        </p>
      </CardContent>
    </Card>
  );
}
