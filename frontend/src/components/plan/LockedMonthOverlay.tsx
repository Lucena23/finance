import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CalendarDays,
  Crown,
  Lock,
  PieChart,
  Receipt,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { usePlan } from '@/contexts/PlanContext';
import { planApi, type LockedMonthSummary } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface LockedMonthOverlayProps {
  month: number;
  year: number;
  /** Variante visual dos dados desfocados ao fundo ('queue' = Fila, 'dashboard' = Painel). */
  variant?: 'queue' | 'dashboard';
  /** Ação opcional para retornar imediatamente ao mês atual liberado. */
  onBackToCurrentMonth?: () => void;
}

/**
 * LockedMonthOverlay — Visualização com desfoque real ("dados embaçados") +
 * resumo real do mês bloqueado no plano Gratuito.
 *
 * Consulta GET /api/v1/plan/locked-summary (que retorna apenas quantidade e
 * soma em centavos, nunca detalhes individuais) e exibe sobre um layout
 * realista desfocado da Fila ou do Painel Gerencial.
 */
export function LockedMonthOverlay({
  month,
  year,
  variant = 'queue',
  onBackToCurrentMonth,
}: LockedMonthOverlayProps): JSX.Element {
  const { openPremiumModal } = usePlan();
  const [summary, setSummary] = useState<LockedMonthSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    planApi
      .lockedSummary({ month, year })
      .then((data) => {
        if (active) setSummary(data);
      })
      .catch(() => {
        if (active) setSummary({ month, year, count: 0, totalAmount: 0 });
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [month, year]);

  const monthName = format(new Date(year, month - 1, 1), 'MMMM', {
    locale: ptBR,
  });
  const capitalizedMonth =
    monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const twoDigitMonth = String(month).padStart(2, '0');

  const count = summary?.count ?? 0;
  const totalFormatted = formatCurrency(summary?.totalAmount ?? 0);

  return (
    <div
      className="relative min-h-[420px] overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-b from-amber-500/[0.06] via-card/60 to-background p-4 sm:p-6 shadow-lg"
      data-testid="locked-month-overlay"
    >
      {/* ─── Camada de fundo: Dados realistas desfocados (Blur) ─── */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none opacity-55 blur-[6px] filter transition-all"
      >
        {variant === 'dashboard' ? (
          <div className="flex flex-col gap-4">
            {/* Cards de Resumo (KPIs) Desfocados */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Total Pago no Mês</span>
                  <Wallet className="h-4 w-4 text-emerald-400" />
                </div>
                <p className="mt-2 text-2xl font-extrabold text-emerald-400">
                  R$ 1.840,00
                </p>
                <span className="text-[11px] text-muted-foreground">
                  4 compromissos quitados
                </span>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Total a Pagar</span>
                  <TrendingUp className="h-4 w-4 text-amber-400" />
                </div>
                <p className="mt-2 text-2xl font-extrabold text-amber-400">
                  {count > 0 ? totalFormatted : 'R$ 950,00'}
                </p>
                <span className="text-[11px] text-muted-foreground">
                  Pendentes em {capitalizedMonth}
                </span>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Total Previsto</span>
                  <PieChart className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-2 text-2xl font-extrabold text-foreground">
                  R$ 2.790,00
                </p>
                <span className="text-[11px] text-muted-foreground">
                  66% do mês quitado
                </span>
              </div>
            </div>

            {/* Gráfico de Rosca + Evolução Desfocados */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Distribuição por Categoria
                </span>
                <div className="flex items-center gap-5 py-2">
                  <div className="h-28 w-28 shrink-0 rounded-full border-[14px] border-primary border-r-amber-400 border-b-emerald-400" />
                  <div className="flex flex-1 flex-col gap-2 text-xs">
                    <div className="flex justify-between">
                      <span>🏠 Moradia e Contas</span>
                      <span className="font-bold">48%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>🛒 Alimentação</span>
                      <span className="font-bold">32%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>🚗 Transporte</span>
                      <span className="font-bold">20%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-card p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Comparativo Mensal da Família
                </span>
                <div className="flex h-28 items-end justify-between gap-2 px-2 pt-4">
                  <div className="h-14 w-full rounded-t bg-emerald-500/70" />
                  <div className="h-20 w-full rounded-t bg-amber-500/70" />
                  <div className="h-16 w-full rounded-t bg-emerald-500/70" />
                  <div className="h-24 w-full rounded-t bg-primary/80" />
                  <div className="h-12 w-full rounded-t bg-amber-500/70" />
                  <div className="h-20 w-full rounded-t bg-emerald-500/70" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Cabeçalho de seção da Fila Desfocado */}
            <div className="flex items-center justify-between rounded-md bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-300">
              <span>🟡 Compromissos de {capitalizedMonth}/{year}</span>
              <span>{count > 0 ? `${count} item(ns)` : '3 itens'}</span>
            </div>

            {/* Cards realistas de despesas desfocados */}
            <div className="flex items-center justify-between rounded-xl border border-border border-l-4 border-l-amber-400 bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 text-amber-300">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    Moradia · Condomínio e Taxas
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Vencimento em 10/{twoDigitMonth}/{year} · Recorrente
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-base font-extrabold text-amber-400">
                  R$ 680,00
                </p>
                <span className="text-[11px] text-muted-foreground">
                  Pendente
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border border-l-4 border-l-primary bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    Energia Elétrica Residencial
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Vencimento em 15/{twoDigitMonth}/{year} · Mensal
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-base font-extrabold text-foreground">
                  R$ 342,90
                </p>
                <span className="text-[11px] text-muted-foreground">
                  Pendente
                </span>
              </div>
            </div>

            <div className="mt-1 flex items-center justify-between rounded-md bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-300">
              <span>🟢 Pagas neste Mês</span>
              <span>Quitadas</span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border border-l-4 border-l-emerald-500 bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    Internet Fibra · Plano Família
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Pago em 05/{twoDigitMonth}/{year}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-base font-extrabold text-emerald-400">
                  R$ 129,90
                </p>
                <span className="text-[11px] text-emerald-400">Pago</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Card Central Glassmorphism de Conversão Premium ─── */}
      <div className="absolute inset-0 flex items-center justify-center bg-background/55 p-4 backdrop-blur-[3px]">
        <div className="flex w-full max-w-md flex-col items-center rounded-2xl border border-amber-400/50 bg-card/95 p-6 text-center shadow-2xl">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-amber-400/50 bg-amber-500/15 text-amber-400 shadow-inner">
            <Lock className="h-5 w-5" />
          </div>

          <span className="mb-1 inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-300">
            <Crown className="h-3 w-3 text-amber-400" />
            Exclusivo Premium
          </span>

          <h3 className="mt-1 text-lg font-extrabold tracking-tight text-foreground">
            {capitalizedMonth} de {year} está protegido
          </h3>

          <div className="mt-3 w-full rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
            {isLoading ? (
              <span>Verificando seus lançamentos salvos neste mês…</span>
            ) : count > 0 ? (
              <div className="space-y-1">
                <p className="flex items-center justify-center gap-1.5 font-bold text-amber-300">
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <span>
                    {count} {count === 1 ? 'compromisso salvo' : 'compromissos salvos'} ({totalFormatted})
                  </span>
                </p>
                <p className="text-amber-100/85">
                  Seus dados de {capitalizedMonth} estão salvos com segurança. Ative o Premium para desbloquear os detalhes e dar baixa.
                </p>
              </div>
            ) : (
              <p className="text-amber-100/90">
                No plano Gratuito você visualiza o <strong>mês atual e o próximo</strong>. Ative o 👑 Premium para liberar a consulta de todos os meses passados e futuros.
              </p>
            )}
          </div>

          <div className="mt-5 flex w-full flex-col gap-2 sm:flex-row">
            {onBackToCurrentMonth && (
              <Button
                type="button"
                variant="outline"
                onClick={onBackToCurrentMonth}
                className="w-full sm:w-auto"
              >
                <CalendarDays className="mr-1.5 h-4 w-4" />
                Mês atual
              </Button>
            )}
            <Button
              type="button"
              onClick={() => openPremiumModal('MONTH_HISTORY')}
              className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 font-bold text-slate-950 shadow-md hover:brightness-110 sm:flex-1"
            >
              <Crown className="mr-1.5 h-4 w-4" />
              Desbloquear com Premium
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
