/**
 * SummaryCards.tsx — Cards de resumo e Inteligência Financeira do Painel Gerencial (TAREFA 44 + v1.2.8).
 *
 * Apresenta os blocos principais do mês, consumindo GET /dashboard/summary:
 *  - Total Pago no Mês (totalPaidMonth) + Barra de Progresso do Mês.
 *  - Total a Pagar no Mês (totalPendingMonth) + Alerta de Atrasos.
 *  - Radar de Juros, Multas & Economia ("Evitar Juros e Encargos"):
 *      • Mostra quanto a família perdeu com juros/multas (e em quais contas)
 *        ou parabeniza por R$ 0,00 de juros no mês.
 *      • Mostra quanto economizou com descontos/acordos.
 *  - Divisão Proporcional por Membro (memberBreakdown) com barras proporcionais.
 *
 * RN-09: relatórios exclusivamente de saídas (sem receitas).
 * §8.2: valores trafegam em centavos (Int); formatação na camada de apresentação.
 * §8.1: proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import {
  AlertCircle,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  Flame,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardSummary } from '@/hooks/useDashboard';
import type { DashboardSummary } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatCurrency, formatPercentage } from '@/lib/utils';

interface SummaryCardsProps {
  /** Mês de referência (1–12). */
  month: number;
  /** Ano de referência (ex: 2026). */
  year: number;
}

/**
 * Badge colorido com as iniciais do membro (RN-08 / §8.8).
 */
function MemberAvatar({
  initials,
  avatarColor,
}: {
  initials: string;
  avatarColor: string;
}): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
      style={{ backgroundColor: avatarColor }}
    >
      {initials}
    </span>
  );
}

/**
 * Bloco de divisão proporcional por membro com barra visual de participação.
 */
function MemberBreakdown({
  members,
  totalPaidMonth,
}: {
  members: DashboardSummary['memberBreakdown'];
  totalPaidMonth: number;
}): JSX.Element {
  if (members.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Nenhum pagamento registrado por membros neste mês.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3.5" data-testid="summary-member-breakdown">
      {members.map((member) => {
        const sharePct =
          totalPaidMonth > 0
            ? Math.min(100, (member.totalPaid / totalPaidMonth) * 100)
            : 0;

        return (
          <li key={member.userId} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <MemberAvatar
                  initials={member.initials}
                  avatarColor={member.avatarColor}
                />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">
                    {member.name}
                  </span>
                  <span className="text-muted-foreground text-[11px] tabular-nums">
                    {formatPercentage(sharePct)} do total quitado
                  </span>
                </div>
              </div>
              <span className="shrink-0 text-sm font-bold tabular-nums">
                {formatCurrency(member.totalPaid)}
              </span>
            </div>
            <div className="bg-muted/60 h-1.5 w-full overflow-hidden rounded-full">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${sharePct}%`,
                  backgroundColor: member.avatarColor,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Conjunto de cards de resumo e inteligência financeira do mês.
 */
export function SummaryCards({ month, year }: SummaryCardsProps): JSX.Element {
  const { summary, isLoading, error, refetch } = useDashboardSummary({
    month,
    year,
  });

  // ── Estado de carregamento ────────────────────────────────────────────
  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        data-testid="summary-cards-loading"
      >
        <span className="sr-only">Carregando resumo do mês…</span>
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={cn(
              'bg-muted h-28 w-full animate-pulse rounded-lg',
              index >= 2 && 'sm:col-span-2',
            )}
          />
        ))}
      </div>
    );
  }

  // ── Estado de erro ────────────────────────────────────────────────────
  if (error || !summary) {
    return (
      <Card
        role="alert"
        className="border-destructive/40"
        data-testid="summary-cards-error"
      >
        <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
          <AlertCircle
            aria-hidden="true"
            className="text-destructive h-8 w-8"
          />
          <p className="text-sm font-medium">
            {error ?? 'Não foi possível carregar o resumo do painel.'}
          </p>
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

  const totalMonthBudget = summary.totalPaidMonth + summary.totalPendingMonth;
  const paidProgressPct =
    totalMonthBudget > 0
      ? Math.min(100, (summary.totalPaidMonth / totalMonthBudget) * 100)
      : 0;

  const totalInterest = summary.totalInterestMonth ?? 0;
  const interestCount = summary.interestCount ?? 0;
  const interestItems = summary.interestItems ?? [];
  const totalDiscount = summary.totalDiscountMonth ?? 0;
  const discountCount = summary.discountCount ?? 0;
  const overdueCount = summary.overdueCount ?? 0;
  const totalOverdueMonth = summary.totalOverdueMonth ?? 0;

  // ── Cards de resumo ───────────────────────────────────────────────────
  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      data-testid="summary-cards"
    >
      {/* Total Pago no Mês */}
      <Card
        className="border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-card to-card"
        data-testid="summary-card-paid"
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Total Pago no Mês
          </CardTitle>
          <ArrowUpCircle
            aria-hidden="true"
            className="h-5 w-5 text-emerald-500"
          />
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p
            className="text-2xl font-bold tabular-nums text-emerald-400"
            data-testid="summary-total-paid"
          >
            {formatCurrency(summary.totalPaidMonth)}
          </p>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Quitação do mês</span>
              <span className="font-semibold tabular-nums text-emerald-400">
                {formatPercentage(paidProgressPct)}
              </span>
            </div>
            <div className="bg-muted/60 h-1.5 w-full overflow-hidden rounded-full">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${paidProgressPct}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total a Pagar no Mês */}
      <Card
        className="border-orange-500/25 bg-gradient-to-br from-orange-500/10 via-card to-card"
        data-testid="summary-card-pending"
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Total a Pagar no Mês
          </CardTitle>
          <ArrowDownCircle
            aria-hidden="true"
            className="h-5 w-5 text-orange-500"
          />
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p
            className="text-2xl font-bold tabular-nums text-orange-400"
            data-testid="summary-total-pending"
          >
            {formatCurrency(summary.totalPendingMonth)}
          </p>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">
              Total previsto no mês:
            </span>
            <span className="font-semibold tabular-nums">
              {formatCurrency(totalMonthBudget)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Radar de Juros, Multas & Economia ("Evitar Juros e Encargos") */}
      <Card
        className={cn(
          'sm:col-span-2',
          totalInterest > 0
            ? 'border-rose-500/35 bg-gradient-to-r from-rose-500/10 via-card to-card'
            : 'border-primary/30 bg-gradient-to-r from-primary/10 via-card to-card',
        )}
        data-testid="summary-card-interest-radar"
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            {totalInterest > 0 ? (
              <Flame aria-hidden="true" className="h-4 w-4 text-rose-400" />
            ) : (
              <ShieldCheck
                aria-hidden="true"
                className="h-4 w-4 text-emerald-400"
              />
            )}
            <CardTitle className="text-sm font-semibold">
              Radar de Juros, Encargos & Economia
            </CardTitle>
          </div>
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            Meta: Zero Juros
          </span>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Bloco 1: Juros / Multas pagos */}
            <div
              className={cn(
                'flex flex-col justify-between gap-2 rounded-lg border p-3',
                totalInterest > 0
                  ? 'border-rose-500/40 bg-rose-500/10'
                  : 'border-emerald-500/30 bg-emerald-500/10',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground text-xs font-medium">
                    Dinheiro perdido com Juros / Multas
                  </span>
                  <span
                    className={cn(
                      'text-xl font-bold tabular-nums',
                      totalInterest > 0 ? 'text-rose-400' : 'text-emerald-400',
                    )}
                    data-testid="summary-total-interest"
                  >
                    {totalInterest > 0
                      ? `+${formatCurrency(totalInterest)}`
                      : 'R$ 0,00'}
                  </span>
                </div>
                {totalInterest > 0 ? (
                  <AlertTriangle
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0 text-rose-400"
                  />
                ) : (
                  <CheckCircle2
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0 text-emerald-400"
                  />
                )}
              </div>

              {totalInterest > 0 ? (
                <div className="flex flex-col gap-1 border-t border-rose-500/20 pt-2">
                  <span className="text-[11px] font-medium text-rose-300">
                    Registrado em {interestCount}{' '}
                    {interestCount === 1 ? 'conta quitada:' : 'contas quitadas:'}
                  </span>
                  <ul className="flex flex-col gap-0.5">
                    {interestItems.map((it, idx) => (
                      <li
                        key={`${it.title}-${idx}`}
                        className="flex items-center justify-between text-[11px]"
                      >
                        <span className="truncate text-muted-foreground">
                          • {it.title}
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums text-rose-300">
                          +{formatCurrency(it.interestAmount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-muted-foreground text-[11px] leading-snug">
                  Excelente! Sua família não perdeu dinheiro com juros ou multas
                  neste mês.
                </p>
              )}
            </div>

            {/* Bloco 2: Descontos / Economia + Alerta de risco de atraso */}
            <div className="flex flex-col justify-between gap-2 rounded-lg border border-border/70 bg-muted/25 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground text-xs font-medium">
                    Economia com Descontos / Acordos
                  </span>
                  <span
                    className={cn(
                      'text-xl font-bold tabular-nums',
                      totalDiscount > 0
                        ? 'text-emerald-400'
                        : 'text-foreground',
                    )}
                    data-testid="summary-total-discount"
                  >
                    {totalDiscount > 0
                      ? `-${formatCurrency(totalDiscount)}`
                      : 'R$ 0,00'}
                  </span>
                </div>
                <Sparkles
                  aria-hidden="true"
                  className={cn(
                    'h-5 w-5 shrink-0',
                    totalDiscount > 0
                      ? 'text-emerald-400'
                      : 'text-muted-foreground',
                  )}
                />
              </div>

              {totalDiscount > 0 ? (
                <p className="text-[11px] font-medium text-emerald-300">
                  Economia conquistada em {discountCount}{' '}
                  {discountCount === 1
                    ? 'pagamento com desconto.'
                    : 'pagamentos com desconto.'}
                </p>
              ) : (
                <p className="text-muted-foreground text-[11px] leading-snug">
                  Ao pagar contas com desconto ou acordo, registre a diferença
                  para acompanhar sua economia aqui.
                </p>
              )}

              {overdueCount > 0 ? (
                <div className="flex items-center justify-between gap-2 rounded-md border border-amber-500/40 bg-amber-500/15 px-2.5 py-1.5 text-[11px]">
                  <span className="font-medium text-amber-300">
                    ⚠️ {overdueCount}{' '}
                    {overdueCount === 1
                      ? 'conta vencida em risco de juros'
                      : 'contas vencidas em risco de juros'}
                  </span>
                  <span className="shrink-0 font-bold tabular-nums text-amber-200">
                    {formatCurrency(totalOverdueMonth)}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Divisão Proporcional por Membro */}
      <Card className="sm:col-span-2" data-testid="summary-card-members">
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Divisão Proporcional por Membro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MemberBreakdown
            members={summary.memberBreakdown}
            totalPaidMonth={summary.totalPaidMonth}
          />
        </CardContent>
      </Card>
    </div>
  );
}
