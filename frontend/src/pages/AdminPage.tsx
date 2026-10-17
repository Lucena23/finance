/**
 * AdminPage.tsx — Painel Aksurim (Admin Global). TAREFA 28 / RN-15.
 *
 * Interface exclusiva do Admin Global da Aksurim Software. Exibe:
 *  - Métricas globais: total de clientes (famílias), usuários, ativos por
 *    período (últimos 30 dias) e volumes financeiros agregados.
 *  - Lista de leads comerciais (CPF SEMPRE mascarado — LGPD / §5.5).
 *  - Exportação de leads em PDF (apresentação a parceiros de crédito) e CSV.
 *
 * SEGURANÇA (RN-15):
 *  - A aba de navegação só é exibida quando `user.isGlobalAdmin === true`.
 *  - A rota é protegida por <GlobalAdminRoute /> (barreira de UX).
 *  - A autorização REAL é validada no backend pelo GlobalAdminGuard, que
 *    revalida `isGlobalAdmin` no banco a cada requisição.
 *  - Role.ADMIN (chefe de família) NÃO tem acesso a esta área.
 *
 * §8.2: valores monetários trafegam como inteiros em centavos (Int); a
 *       conversão para "R$ X.XXX,XX" ocorre exclusivamente na apresentação.
 * §8.1: proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import {
  AlertCircle,
  Building2,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useAdminLeads, useAdminMetrics } from '@/hooks/useAdmin';
import { cn } from '@/lib/cn';
import type { AdminLead, LeadExportFormat } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

/**
 * Card individual de métrica global.
 */
interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Users;
  accent?: string;
  testId?: string;
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = 'text-primary',
  testId,
}: MetricCardProps): JSX.Element {
  return (
    <Card data-testid={testId}>
      <CardContent className="flex items-start gap-3 p-4">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted',
            accent,
          )}
        >
          <Icon aria-hidden="true" className="h-5 w-5" />
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-muted-foreground text-xs font-medium">
            {label}
          </span>
          <span className="text-xl font-bold tabular-nums">{value}</span>
          {hint ? (
            <span className="text-muted-foreground text-[11px]">{hint}</span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Bloco de métricas globais do Painel Aksurim.
 */
function MetricsSection(): JSX.Element {
  const { metrics, isLoading, error, refetch } = useAdminMetrics();

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="grid grid-cols-2 gap-3"
        data-testid="admin-metrics-loading"
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="bg-muted h-20 w-full animate-pulse rounded-lg"
          />
        ))}
        <span className="sr-only">Carregando métricas globais…</span>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <Card
        role="alert"
        className="border-destructive/40"
        data-testid="admin-metrics-error"
      >
        <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
          <AlertCircle aria-hidden="true" className="text-destructive h-8 w-8" />
          <p className="text-sm font-medium">
            {error ?? 'Não foi possível carregar as métricas globais.'}
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

  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      data-testid="admin-metrics"
    >
      <MetricCard
        label="Famílias (clientes)"
        value={String(metrics.totalFamilies)}
        hint={`+${metrics.familiesCreatedLast30Days} nos últimos 30 dias`}
        icon={Building2}
        accent="text-primary"
        testId="admin-metric-families"
      />
      <MetricCard
        label="Usuários totais"
        value={String(metrics.totalUsers)}
        hint={`+${metrics.usersCreatedLast30Days} nos últimos 30 dias`}
        icon={Users}
        accent="text-aksurim-highlight"
        testId="admin-metric-users"
      />
      <MetricCard
        label="Usuários ativos"
        value={String(metrics.totalActiveUsers)}
        hint="E-mail verificado"
        icon={ShieldCheck}
        accent="text-emerald-500"
        testId="admin-metric-active-users"
      />
      <MetricCard
        label="Despesas ativas"
        value={String(metrics.totalExpenses)}
        hint="Excluindo soft-deleted"
        icon={TrendingUp}
        accent="text-aksurim-primary"
        testId="admin-metric-expenses"
      />
      <MetricCard
        label="Volume pago"
        value={formatCurrency(metrics.totalPaidAmount)}
        hint="Toda a base"
        icon={Wallet}
        accent="text-emerald-500"
        testId="admin-metric-paid"
      />
      <MetricCard
        label="Volume a pagar"
        value={formatCurrency(metrics.totalPendingAmount)}
        hint="Pendências globais"
        icon={Wallet}
        accent="text-aksurim-warning"
        testId="admin-metric-pending"
      />
    </div>
  );
}

/**
 * Paleta de cores de identificação visual por conta/família no Painel Aksurim.
 * Garante que o Titular (ADMIN) e seus Membros (MEMBER) compartilhem a mesma
 * identidade cromática e hierarquia visual para suporte rápido.
 */
interface FamilyColorTheme {
  borderLeft: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotBg: string;
  subRowBg: string;
}

const FAMILY_COLOR_PALETTE: readonly FamilyColorTheme[] = [
  {
    borderLeft: 'border-l-emerald-500',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-500/35',
    dotBg: 'bg-emerald-400',
    subRowBg: 'bg-emerald-950/15',
  },
  {
    borderLeft: 'border-l-cyan-500',
    badgeBg: 'bg-cyan-500/15',
    badgeText: 'text-cyan-300',
    badgeBorder: 'border-cyan-500/35',
    dotBg: 'bg-cyan-400',
    subRowBg: 'bg-cyan-950/15',
  },
  {
    borderLeft: 'border-l-violet-500',
    badgeBg: 'bg-violet-500/15',
    badgeText: 'text-violet-300',
    badgeBorder: 'border-violet-500/35',
    dotBg: 'bg-violet-400',
    subRowBg: 'bg-violet-950/15',
  },
  {
    borderLeft: 'border-l-amber-500',
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-300',
    badgeBorder: 'border-amber-500/35',
    dotBg: 'bg-amber-400',
    subRowBg: 'bg-amber-950/15',
  },
  {
    borderLeft: 'border-l-rose-500',
    badgeBg: 'bg-rose-500/15',
    badgeText: 'text-rose-300',
    badgeBorder: 'border-rose-500/35',
    dotBg: 'bg-rose-400',
    subRowBg: 'bg-rose-950/15',
  },
  {
    borderLeft: 'border-l-sky-500',
    badgeBg: 'bg-sky-500/15',
    badgeText: 'text-sky-300',
    badgeBorder: 'border-sky-500/35',
    dotBg: 'bg-sky-400',
    subRowBg: 'bg-sky-950/15',
  },
];

interface GroupedFamilyLeads {
  familyAccountId: string;
  familyName: string;
  colorIndex: number;
  theme: FamilyColorTheme;
  leads: AdminLead[];
}

/**
 * Bloco de leads comerciais + exportação (PDF/CSV) + gestão manual de planos.
 * Agrupa usuários por Conta/Família com o ADMIN como linha principal e os
 * MEMBERs recuados em modo sub-hierarquia com a mesma cor da família.
 */
function LeadsSection(): JSX.Element {
  const {
    leads,
    isLoading,
    isExporting,
    updatingFamilyId,
    error,
    refetch,
    exportLeads,
    updateFamilyPlan,
  } = useAdminLeads();
  const [pendingFormat, setPendingFormat] = useState<LeadExportFormat | null>(
    null,
  );

  const handleExport = async (format: LeadExportFormat): Promise<void> => {
    setPendingFormat(format);
    try {
      await exportLeads(format);
    } finally {
      setPendingFormat(null);
    }
  };

  const familyGroups = useMemo<GroupedFamilyLeads[]>(() => {
    const map = new Map<string, AdminLead[]>();

    for (const lead of leads) {
      const group = map.get(lead.familyAccountId);
      if (group) {
        group.push(lead);
      } else {
        map.set(lead.familyAccountId, [lead]);
      }
    }

    const result: GroupedFamilyLeads[] = [];
    let groupIdx = 0;

    for (const [familyAccountId, groupLeads] of map.entries()) {
      // Ordena dentro da família: ADMIN (Titular) sempre no topo, seguido pelos MEMBERs
      const sorted = [...groupLeads].sort((a, b) => {
        if (a.userRole === 'ADMIN' && b.userRole !== 'ADMIN') return -1;
        if (a.userRole !== 'ADMIN' && b.userRole === 'ADMIN') return 1;
        return a.userName.localeCompare(b.userName, 'pt-BR');
      });

      const colorIndex = groupIdx % FAMILY_COLOR_PALETTE.length;
      const theme = FAMILY_COLOR_PALETTE[colorIndex]!;

      result.push({
        familyAccountId,
        familyName: sorted[0]?.familyName ?? 'Conta',
        colorIndex,
        theme,
        leads: sorted,
      });

      groupIdx += 1;
    }

    return result;
  }, [leads]);

  const totalLeadsCount = leads.length;
  const totalFamiliesCount = familyGroups.length;

  return (
    <Card data-testid="admin-leads">
      <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base">
            Leads comerciais e Gestão de Assinaturas
          </CardTitle>
          <p className="text-muted-foreground text-xs">
            {totalFamiliesCount} conta(s)/família(s) · {totalLeadsCount}{' '}
            usuário(s) · Agrupados por titular e sub-membros com cor da família
            · CPF mascarado (LGPD)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isExporting || totalLeadsCount === 0}
            onClick={() => void handleExport('csv')}
            data-testid="admin-export-csv"
          >
            {isExporting && pendingFormat === 'csv' ? (
              <Spinner label="Exportando CSV…" />
            ) : (
              <FileSpreadsheet aria-hidden="true" className="h-4 w-4" />
            )}
            CSV
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isExporting || totalLeadsCount === 0}
            onClick={() => void handleExport('pdf')}
            data-testid="admin-export-pdf"
          >
            {isExporting && pendingFormat === 'pdf' ? (
              <Spinner label="Exportando PDF…" />
            ) : (
              <FileText aria-hidden="true" className="h-4 w-4" />
            )}
            PDF
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {error ? (
          <div
            role="alert"
            className="bg-destructive/10 text-destructive mx-6 mb-4 rounded-md px-3 py-2 text-sm"
            data-testid="admin-leads-error"
          >
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center justify-center gap-2 p-8 text-sm"
            data-testid="admin-leads-loading"
          >
            <Spinner label="Carregando leads…" />
            <span className="text-muted-foreground">Carregando leads…</span>
          </div>
        ) : totalLeadsCount === 0 ? (
          <div
            className="text-muted-foreground flex flex-col items-center gap-2 p-8 text-center text-sm"
            data-testid="admin-leads-empty"
          >
            <Download aria-hidden="true" className="h-6 w-6" />
            Nenhum lead disponível para exportação.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Conta / Família
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Usuário / Hierarquia
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    E-mail
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    WhatsApp
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    CPF (Titular)
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Plano da Conta
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Ações de Plano
                  </th>
                </tr>
              </thead>
              <tbody>
                {familyGroups.map((group) => {
                  const isUpdating = updatingFamilyId === group.familyAccountId;
                  const memberCount = group.leads.length;
                  const adminUser = group.leads.find(
                    (l) => l.userRole === 'ADMIN',
                  );

                  return group.leads.map((lead, idxInGroup) => {
                    const isSubMember = lead.userRole !== 'ADMIN' && idxInGroup > 0;
                    const isFirstInFamily = idxInGroup === 0;
                    const planStatus = lead.planStatus ?? 'FREE';
                    const planDaysLeft = lead.planDaysLeft ?? 0;

                    return (
                      <tr
                        key={`${lead.familyAccountId}-${lead.userEmail}-${idxInGroup}`}
                        className={cn(
                          'border-l-4 transition-colors',
                          group.theme.borderLeft,
                          isFirstInFamily
                            ? 'border-border border-t-2 bg-card/80'
                            : cn(
                                'border-border/50 border-t',
                                group.theme.subRowBg,
                              ),
                        )}
                      >
                        {/* Coluna 1: Família / Agrupamento */}
                        <td className="px-4 py-2.5 font-medium">
                          {isFirstInFamily ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span
                                  className={cn(
                                    'inline-block h-2.5 w-2.5 shrink-0 rounded-full',
                                    group.theme.dotBg,
                                  )}
                                  aria-hidden="true"
                                />
                                <span className="font-semibold text-foreground">
                                  {lead.familyName}
                                </span>
                                <span
                                  className={cn(
                                    'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold',
                                    group.theme.badgeBg,
                                    group.theme.badgeText,
                                    group.theme.badgeBorder,
                                  )}
                                >
                                  👥 {memberCount}{' '}
                                  {memberCount === 1 ? 'usuário' : 'usuários'}
                                </span>
                              </div>
                              <span className="text-muted-foreground text-[11px] font-normal">
                                Criada em {formatDate(lead.createdAt)}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 pl-3 text-xs">
                              <span
                                className={cn(
                                  'font-mono text-sm font-bold',
                                  group.theme.badgeText,
                                )}
                                aria-hidden="true"
                              >
                                └─
                              </span>
                              <div className="flex flex-col">
                                <span
                                  className={cn(
                                    'text-[11px] font-semibold',
                                    group.theme.badgeText,
                                  )}
                                >
                                  Sub-membro · {lead.familyName}
                                </span>
                                <span className="text-muted-foreground text-[10px]">
                                  Titular: {adminUser?.userName ?? 'Admin'}
                                </span>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Coluna 2: Usuário / Hierarquia */}
                        <td className="px-4 py-2.5">
                          <div
                            className={cn(
                              'flex flex-wrap items-center gap-1.5',
                              isSubMember &&
                                'border-border/70 ml-2 border-l-2 pl-2.5',
                            )}
                          >
                            <span
                              className={cn(
                                isSubMember
                                  ? 'text-foreground/90 font-normal'
                                  : 'font-semibold text-foreground',
                              )}
                            >
                              {lead.userName}
                            </span>
                            {lead.userRole === 'ADMIN' ? (
                              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-400">
                                👑 ADMIN · Titular
                              </span>
                            ) : (
                              <span
                                className={cn(
                                  'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase',
                                  group.theme.badgeBg,
                                  group.theme.badgeText,
                                  group.theme.badgeBorder,
                                )}
                              >
                                ↳ Membro
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Coluna 3: E-mail */}
                        <td className="text-muted-foreground px-4 py-2.5">
                          {lead.userEmail}
                        </td>

                        {/* Coluna 4: WhatsApp */}
                        <td className="px-4 py-2.5 tabular-nums">
                          {lead.userWhatsapp || '-'}
                        </td>

                        {/* Coluna 5: CPF */}
                        <td className="px-4 py-2.5 tabular-nums">
                          {lead.ownerCpfMasked}
                        </td>

                        {/* Coluna 6: Plano */}
                        <td className="px-4 py-2.5">
                          {planStatus === 'PREMIUM' ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-300">
                              👑 Premium ({planDaysLeft}d)
                            </span>
                          ) : planStatus === 'TRIAL' ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                              👑 Teste ({planDaysLeft}d)
                            </span>
                          ) : planStatus === 'GRACE' ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-orange-400/40 bg-orange-500/15 px-2 py-0.5 text-[11px] font-semibold text-orange-300">
                              ⚠️ Carência ({planDaysLeft}d)
                            </span>
                          ) : (
                            <span className="bg-muted text-muted-foreground inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium">
                              Gratuito
                            </span>
                          )}
                        </td>

                        {/* Coluna 7: Status E-mail */}
                        <td className="px-4 py-2.5">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
                              lead.isEmailVerified
                                ? 'bg-emerald-500/15 text-emerald-500'
                                : 'bg-aksurim-warning/15 text-aksurim-warning',
                            )}
                          >
                            {lead.isEmailVerified ? 'Ativo' : 'Pendente'}
                          </span>
                        </td>

                        {/* Coluna 8: Ações de Plano (exibidas no Titular da Conta) */}
                        <td className="px-4 py-2.5">
                          {isFirstInFamily ? (
                            <div className="flex flex-wrap items-center gap-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={isUpdating}
                                className="h-7 border-amber-400/40 bg-amber-500/10 px-2 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/20"
                                onClick={() =>
                                  void updateFamilyPlan(lead.familyAccountId, {
                                    action: 'GRANT_PREMIUM',
                                    billingCycle: 'MONTHLY',
                                  })
                                }
                                title="Ativar 30 dias de Premium Mensal para toda a conta"
                              >
                                👑 +30d
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={isUpdating}
                                className="h-7 border-amber-400/40 bg-amber-500/10 px-2 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/20"
                                onClick={() =>
                                  void updateFamilyPlan(lead.familyAccountId, {
                                    action: 'GRANT_PREMIUM',
                                    billingCycle: 'ANNUAL',
                                  })
                                }
                                title="Ativar 365 dias de Premium Anual para toda a conta"
                              >
                                👑 +1 ano
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                disabled={isUpdating}
                                className="h-7 px-2 text-[11px]"
                                onClick={() =>
                                  void updateFamilyPlan(lead.familyAccountId, {
                                    action: 'EXTEND_TRIAL',
                                    trialDays: 15,
                                  })
                                }
                                title="Renovar 15 dias de teste gratuito"
                              >
                                +15d Teste
                              </Button>
                              {planStatus !== 'FREE' ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  disabled={isUpdating}
                                  className="text-destructive hover:text-destructive h-7 px-2 text-[11px]"
                                  onClick={() =>
                                    void updateFamilyPlan(
                                      lead.familyAccountId,
                                      {
                                        action: 'REVOKE',
                                      },
                                    )
                                  }
                                  title="Revogar assinatura da conta (voltar para Free)"
                                >
                                  Revogar
                                </Button>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-muted-foreground inline-flex items-center gap-1 text-[11px] italic">
                              ↳ Segue plano do Titular
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end p-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void refetch()}
            disabled={isLoading}
          >
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Página do Painel Aksurim (rota "/admin"). Exclusiva do Admin Global (RN-15).
 */
export function AdminPage(): JSX.Element {
  return (
    <section className="flex flex-col gap-5 pb-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <ShieldCheck
            aria-hidden="true"
            className="text-aksurim-highlight h-6 w-6"
          />
          <h1 className="text-xl font-bold tracking-tight">Painel Aksurim</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Visão global da base de clientes, métricas de adoção e extração de
          leads comerciais. Área exclusiva do Admin Global.
        </p>
      </header>

      <MetricsSection />
      <LeadsSection />
    </section>
  );
}
