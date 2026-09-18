/**
 * SummaryCards.tsx — Cards de resumo do Painel Gerencial (TAREFA 44).
 *
 * Apresenta os três blocos principais do mês, consumindo GET /dashboard/summary:
 *  - Total Pago no Mês (totalPaidMonth).
 *  - Total a Pagar no Mês (totalPendingMonth).
 *  - Divisão Proporcional por Membro (memberBreakdown) — cada membro exibido
 *    com badge colorido (iniciais + avatarColor) e o total quitado por ele.
 *
 * RN-09: relatórios exclusivamente de saídas (sem receitas).
 * §8.2: valores trafegam em centavos (Int); a formatação para "R$ X.XXX,XX"
 *       ocorre exclusivamente aqui, na camada de apresentação.
 * §8.1: proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import { AlertCircle, ArrowDownCircle, ArrowUpCircle, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardSummary } from '@/hooks/useDashboard';
import type { DashboardSummary } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/utils';

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
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
      style={{ backgroundColor: avatarColor }}
    >
      {initials}
    </span>
  );
}

/**
 * Bloco de divisão proporcional por membro.
 */
function MemberBreakdown({
  members,
}: {
  members: DashboardSummary['memberBreakdown'];
}): JSX.Element {
  if (members.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Nenhum pagamento registrado por membros neste mês.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3" data-testid="summary-member-breakdown">
      {members.map((member) => (
        <li
          key={member.userId}
          className="flex items-center justify-between gap-3"
        >
          <div className="flex min-w-0 items-center gap-2">
            <MemberAvatar
              initials={member.initials}
              avatarColor={member.avatarColor}
            />
            <span className="truncate text-sm font-medium">{member.name}</span>
          </div>
          <span className="shrink-0 text-sm font-semibold tabular-nums">
            {formatCurrency(member.totalPaid)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Conjunto de cards de resumo do mês (Total Pago, a Pagar e Divisão por Membro).
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
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className={cn(
              'bg-muted h-28 w-full animate-pulse rounded-lg',
              index === 2 && 'sm:col-span-2',
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
          <AlertCircle aria-hidden="true" className="text-destructive h-8 w-8" />
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

  // ── Cards de resumo ───────────────────────────────────────────────────
  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      data-testid="summary-cards"
    >
      {/* Total Pago no Mês */}
      <Card data-testid="summary-card-paid">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Total Pago no Mês
          </CardTitle>
          <ArrowUpCircle
            aria-hidden="true"
            className="h-5 w-5 text-emerald-500"
          />
        </CardHeader>
        <CardContent>
          <p
            className="text-2xl font-bold tabular-nums"
            data-testid="summary-total-paid"
          >
            {formatCurrency(summary.totalPaidMonth)}
          </p>
        </CardContent>
      </Card>

      {/* Total a Pagar no Mês */}
      <Card data-testid="summary-card-pending">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Total a Pagar no Mês
          </CardTitle>
          <ArrowDownCircle
            aria-hidden="true"
            className="h-5 w-5 text-orange-500"
          />
        </CardHeader>
        <CardContent>
          <p
            className="text-2xl font-bold tabular-nums"
            data-testid="summary-total-pending"
          >
            {formatCurrency(summary.totalPendingMonth)}
          </p>
        </CardContent>
      </Card>

      {/* Divisão Proporcional por Membro */}
      <Card className="sm:col-span-2" data-testid="summary-card-members">
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Divisão por Membro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MemberBreakdown members={summary.memberBreakdown} />
        </CardContent>
      </Card>
    </div>
  );
}
