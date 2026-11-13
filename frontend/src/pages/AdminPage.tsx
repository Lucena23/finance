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
  Eye,
  FileSpreadsheet,
  FileText,
  Megaphone,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { useAdminLeads, useAdminMetrics } from '@/hooks/useAdmin';
import { cn } from '@/lib/cn';
import {
  adminApi,
  type AdminLead,
  type AdminTransactionView,
  type LeadExportFormat,
  type SystemAnnouncement,
} from '@/lib/api';
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

type TxSortField =
  | 'createdAt'
  | 'familyName'
  | 'billingCycle'
  | 'amountCents'
  | 'status';

/**
 * Seção de Transações e Estornos (Mercado Pago) para o Admin Global.
 */
function TransactionsSection(): JSX.Element {
  const [txs, setTxs] = useState<AdminTransactionView[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [clearing, setClearing] = useState<boolean>(false);
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'PAID_OR_REFUNDED' | 'ALL'>('ALL');
  const [sortField, setSortField] = useState<TxSortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const loadTxs = async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await adminApi.transactions();
      setTxs(data);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('plan-updated'));
        window.dispatchEvent(new CustomEvent('admin-tx-updated'));
      }
    } catch {
      // ignora silenciosamente se vazio
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTxs();
  }, []);

  const handleClearPending = async (): Promise<void> => {
    setClearing(true);
    setFeedback(null);
    try {
      const res = await adminApi.clearPendingTransactions();
      setFeedback(
        res.deletedCount > 0
          ? `${res.deletedCount} tentativa(s) pendente(s)/abandonada(s) removida(s) com sucesso.`
          : 'Nenhuma transação pendente para limpar.',
      );
      await loadTxs();
    } catch (err) {
      setFeedback(
        err instanceof Error ? err.message : 'Não foi possível limpar as pendentes.',
      );
    } finally {
      setClearing(false);
    }
  };

  const handleSort = (field: TxSortField): void => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'createdAt' || field === 'amountCents' ? 'desc' : 'asc');
    }
  };

  const paidOrRefundedCount = txs.filter(
    (t) =>
      t.status === 'APPROVED' ||
      t.status === 'AUTHORIZED' ||
      t.status === 'REFUNDED',
  ).length;

  const pendingCount = txs.filter(
    (t) =>
      t.status === 'PENDING' ||
      t.status === 'REJECTED' ||
      t.status === 'CANCELLED',
  ).length;

  const filteredTxs =
    filterMode === 'PAID_OR_REFUNDED'
      ? txs.filter(
          (t) =>
            t.status === 'APPROVED' ||
            t.status === 'AUTHORIZED' ||
            t.status === 'REFUNDED',
        )
      : txs;

  const sortedTxs = [...filteredTxs].sort((a, b) => {
    const dir = sortOrder === 'asc' ? 1 : -1;
    switch (sortField) {
      case 'createdAt':
        return (
          (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir
        );
      case 'familyName':
        return a.familyName.localeCompare(b.familyName, 'pt-BR') * dir;
      case 'billingCycle':
        return a.billingCycle.localeCompare(b.billingCycle, 'pt-BR') * dir;
      case 'amountCents':
        return (a.amountCents - b.amountCents) * dir;
      case 'status':
        return a.status.localeCompare(b.status, 'pt-BR') * dir;
      default:
        return 0;
    }
  });

  const renderSortIcon = (field: TxSortField): string => {
    if (sortField !== field) return '↕';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const handleRefund = async (tx: AdminTransactionView): Promise<void> => {
    const customReais = window.prompt(
      `Estornar pagamento da família "${tx.familyName}" (${formatCurrency(
        tx.amountCents,
      )}).\n\nDeixe em branco para ESTORNO TOTAL ou digite o valor parcial em reais (ex: 6,99):`,
      '',
    );
    if (customReais === null) return;

    let amountCents: number | undefined;
    const trimmed = customReais.trim().replace(',', '.');
    if (trimmed !== '') {
      const parsed = Math.round(Number(trimmed) * 100);
      if (!Number.isFinite(parsed) || parsed <= 0 || parsed > tx.amountCents) {
        setFeedback('Valor parcial inválido.');
        return;
      }
      amountCents = parsed;
    }

    setRefundingId(tx.id);
    setFeedback(null);
    try {
      const res = await adminApi.refundTransaction(tx.id, { amountCents });
      setFeedback(
        `Estorno de ${formatCurrency(res.refundedAmountCents)} realizado com sucesso para ${tx.familyName}.`,
      );
      await loadTxs();
    } catch (err) {
      setFeedback(
        err instanceof Error ? err.message : 'Falha ao estornar no Mercado Pago.',
      );
    } finally {
      setRefundingId(null);
    }
  };

  return (
    <Card data-testid="admin-transactions">
      <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base">
            Transações e Estornos (Mercado Pago)
          </CardTitle>
          <p className="text-muted-foreground text-xs">
            Histórico de pagamentos de assinaturas com estorno total ou parcial em 1 clique.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setFilterMode('PAID_OR_REFUNDED')}
              className={cn(
                'rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all',
                filterMode === 'PAID_OR_REFUNDED'
                  ? 'bg-card text-emerald-300 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Pagas / Estornadas ({paidOrRefundedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('ALL')}
              className={cn(
                'rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all',
                filterMode === 'ALL'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Todas ({txs.length})
            </button>
          </div>

          {pendingCount > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleClearPending()}
              disabled={clearing || loading}
              className="h-8 text-xs"
            >
              {clearing ? 'Limpando...' : `Limpar Pendentes (${pendingCount})`}
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void loadTxs()}
            disabled={loading}
            className="h-8"
          >
            <RefreshCw
              aria-hidden="true"
              className={cn('h-4 w-4', loading && 'animate-spin')}
            />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {feedback && (
          <div className="mx-6 mb-3 rounded-md border border-amber-400/40 bg-amber-500/15 px-3 py-2 text-xs text-amber-100">
            {feedback}
          </div>
        )}
        {txs.length === 0 ? (
          <div className="text-muted-foreground p-6 text-center text-xs">
            Nenhuma transação registrada no Mercado Pago até o momento.
          </div>
        ) : (
          <div className="max-h-[340px] overflow-x-auto overflow-y-auto border-t border-border/60">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead className="sticky top-0 z-10 bg-muted/95 text-muted-foreground uppercase backdrop-blur">
                <tr>
                  <th className="px-4 py-2 font-medium">
                    <button
                      type="button"
                      onClick={() => handleSort('createdAt')}
                      className="inline-flex items-center gap-1 font-medium uppercase hover:text-foreground"
                    >
                      Data <span>{renderSortIcon('createdAt')}</span>
                    </button>
                  </th>
                  <th className="px-4 py-2 font-medium">
                    <button
                      type="button"
                      onClick={() => handleSort('familyName')}
                      className="inline-flex items-center gap-1 font-medium uppercase hover:text-foreground"
                    >
                      Família / Titular <span>{renderSortIcon('familyName')}</span>
                    </button>
                  </th>
                  <th className="px-4 py-2 font-medium">
                    <button
                      type="button"
                      onClick={() => handleSort('billingCycle')}
                      className="inline-flex items-center gap-1 font-medium uppercase hover:text-foreground"
                    >
                      Plano / Modalidade <span>{renderSortIcon('billingCycle')}</span>
                    </button>
                  </th>
                  <th className="px-4 py-2 font-medium">
                    <button
                      type="button"
                      onClick={() => handleSort('amountCents')}
                      className="inline-flex items-center gap-1 font-medium uppercase hover:text-foreground"
                    >
                      Valor <span>{renderSortIcon('amountCents')}</span>
                    </button>
                  </th>
                  <th className="px-4 py-2 font-medium">
                    <button
                      type="button"
                      onClick={() => handleSort('status')}
                      className="inline-flex items-center gap-1 font-medium uppercase hover:text-foreground"
                    >
                      Status <span>{renderSortIcon('status')}</span>
                    </button>
                  </th>
                  <th className="px-4 py-2 font-medium">Ação</th>
                </tr>
              </thead>
              <tbody>
                {sortedTxs.map((tx) => (
                  <tr key={tx.id} className="border-t border-border/60">
                    <td className="px-4 py-2.5 tabular-nums">
                      {formatDate(tx.createdAt)}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-foreground">
                        {tx.familyName}
                      </div>
                      <div className="text-muted-foreground">{tx.userEmail}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      {tx.billingCycle} · {tx.paymentMode}
                    </td>
                    <td className="px-4 py-2.5 font-semibold tabular-nums">
                      {formatCurrency(tx.amountCents)}
                      {tx.refundedAmountCents
                        ? ` (Estornado: ${formatCurrency(tx.refundedAmountCents)})`
                        : ''}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[10px] font-bold',
                          tx.status === 'APPROVED'
                            ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-300'
                            : tx.status === 'REFUNDED'
                              ? 'border-rose-400/50 bg-rose-500/15 text-rose-300'
                              : tx.status === 'REJECTED' || tx.status === 'CANCELLED'
                                ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                                : 'border-border text-muted-foreground',
                        )}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {tx.status === 'APPROVED' && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={refundingId === tx.id}
                          onClick={() => void handleRefund(tx)}
                          className="h-7 border-rose-500/40 px-2.5 text-[11px] text-rose-300 hover:bg-rose-500/15"
                        >
                          {refundingId === tx.id ? 'Estornando...' : 'Estornar'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Seção de Comunicados e Novidades do Software para o Admin Global (v1.3.1).
 */
function AnnouncementsSection(): JSX.Element {
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [title, setTitle] = useState<string>('');
  const [version, setVersion] = useState<string>('1.3.1');
  const [body, setBody] = useState<string>('');
  const [sendPush, setSendPush] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);

  const fetchHistory = async (): Promise<void> => {
    try {
      const data = await adminApi.announcements();
      setAnnouncements(data);
    } catch {
      // ignora se offline
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchHistory();
  }, []);

  const handlePublish = async (): Promise<void> => {
    if (!title.trim() || !body.trim()) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await adminApi.publishAnnouncement({
        title: title.trim(),
        body: body.trim(),
        version: version.trim() || undefined,
        sendPush,
      });
      setTitle('');
      setBody('');
      setConfirmOpen(false);
      setFeedback({
        type: 'success',
        text: `Comunicado publicado com sucesso! ${res.pushSentCount} pushes entregues com sucesso.`,
      });
      await fetchHistory();
    } catch (err) {
      setFeedback({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Falha ao publicar o comunicado.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card data-testid="admin-announcements">
      <CardHeader className="flex flex-col gap-1 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="h-4 w-4 text-amber-400" />
            Comunicados e Novidades do Software (v1.3.1)
          </CardTitle>
          <p className="text-muted-foreground text-xs">
            Publique novidades, melhorias ou notas de versão que serão exibidas
            automaticamente no modal de 100% dos clientes e, opcionalmente,
            disparadas como Web Push.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void fetchHistory()}
          className="gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Atualizar
        </Button>
      </CardHeader>

      <CardContent className="space-y-5 p-5">
        {feedback && (
          <div
            role="alert"
            className={cn(
              'rounded-lg border p-3 text-xs font-medium',
              feedback.type === 'success'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                : 'border-destructive/50 bg-destructive/10 text-destructive',
            )}
          >
            {feedback.text}
          </div>
        )}

        {/* Formulário de Envio */}
        <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3 text-xs">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="space-y-1 sm:col-span-3">
              <label htmlFor="ann-title" className="font-semibold text-foreground">
                Título do Comunicado
              </label>
              <input
                id="ann-title"
                type="text"
                placeholder="Ex: Atualização v1.3.1 — Novo Checkout Transparente e Notificações"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="ann-ver" className="font-semibold text-foreground">
                Versão (SemVer)
              </label>
              <input
                id="ann-ver"
                type="text"
                placeholder="1.3.1"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="ann-body" className="font-semibold text-foreground">
              Mensagem / Novidades (texto formatado com parágrafos)
            </label>
            <textarea
              id="ann-body"
              rows={4}
              placeholder="Descreva as melhorias implementadas, sugestões atendidas de clientes ou novidades operacionais..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-md border border-input bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={sendPush}
                onChange={(e) => setSendPush(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-amber-400"
              />
              Disparar Web Push para dispositivos com &ldquo;Novidades do Sistema&rdquo; ativas
            </label>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!title.trim() || !body.trim()}
                onClick={() => setPreviewOpen(true)}
                className="gap-1.5"
              >
                <Eye className="h-3.5 w-3.5" />
                Ver Prévia
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!title.trim() || !body.trim() || submitting}
                onClick={() => setConfirmOpen(true)}
                className="gap-1.5 bg-gradient-to-r from-amber-400 to-yellow-500 font-bold text-slate-950 hover:brightness-110"
              >
                <Send className="h-3.5 w-3.5" />
                Publicar Comunicado
              </Button>
            </div>
          </div>
        </div>

        {/* Histórico de Comunicados */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Histórico de Comunicados Publicados ({announcements.length})
          </p>

          {loading ? (
            <div className="py-4 text-center">
              <Spinner className="mx-auto h-5 w-5" />
            </div>
          ) : announcements.length === 0 ? (
            <p className="py-3 text-center text-xs text-muted-foreground">
              Nenhum comunicado publicado ainda.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Data</th>
                    <th className="px-3 py-2">Versão</th>
                    <th className="px-3 py-2">Título</th>
                    <th className="px-3 py-2 text-right">Pushes Enviados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {announcements.map((ann) => (
                    <tr key={ann.id} className="hover:bg-muted/30">
                      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                        {formatDate(ann.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono font-bold text-foreground">
                        {ann.version ? `v${ann.version}` : '—'}
                      </td>
                      <td className="px-3 py-2 font-medium text-foreground">
                        {ann.title}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-emerald-400">
                        {ann.pushSentCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>

      {/* Modal de Prévia do Comunicado */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-md sm:max-w-lg border-border/80 bg-card p-6 shadow-2xl">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-0.5 text-xs font-bold text-amber-300">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                Novidades do Sistema (Prévia)
              </span>
              {version && (
                <span className="rounded-md border border-border bg-muted/60 px-2 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground">
                  v{version}
                </span>
              )}
            </div>
            <DialogTitle className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
              {title || 'Título do Comunicado'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Esta é exatamente a aparência com que o comunicado será exibido no app de todos os clientes.
            </DialogDescription>
          </DialogHeader>

          <div className="my-2 max-h-[60vh] overflow-y-auto rounded-lg border border-border/60 bg-muted/20 p-4 text-xs leading-relaxed text-foreground/90 sm:text-sm">
            <div className="whitespace-pre-line space-y-2">
              {body || 'Corpo da mensagem do comunicado...'}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="w-full sm:w-auto"
            >
              Fechar Prévia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação antes de Disparar */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar publicação de comunicado?</DialogTitle>
            <DialogDescription className="text-xs">
              O comunicado será salvo na base e exibido no modal do app para todos os clientes.
              {sendPush && ' Além disso, será transmitido via Web Push para todos os dispositivos cadastrados.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => setConfirmOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={submitting}
              onClick={() => void handlePublish()}
              className="bg-gradient-to-r from-amber-400 to-yellow-500 font-bold text-slate-950 hover:brightness-110"
            >
              {submitting ? 'Publicando...' : 'Confirmar e Publicar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
      <AnnouncementsSection />
      <TransactionsSection />
      <LeadsSection />
    </section>
  );
}
