import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  CreditCard,
  Crown,
  Loader2,
  QrCode,
  RefreshCcw,
  ShieldCheck,
  Star,
  XCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePlan } from '@/contexts/PlanContext';
import { useAuth } from '@/hooks/useAuth';
import {
  ApiError,
  planApi,
  type BillingCycle,
  type CheckoutPaymentMode,
  type FamilySubscriptionSummary,
} from '@/lib/api';
import { cn } from '@/lib/cn';
import { Role } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/utils';

interface PlanTier {
  id: BillingCycle;
  name: string;
  monthlyPrice: string;
  totalPrice: string;
  amountCents: number;
  discountBadge?: string;
  popular?: boolean;
  subtitle: string;
}

/**
 * Tabela oficial de planos com redução numerológica = 8 (Prosperidade):
 * - Mensal:    R$ 12,95 (1+2+9+5 = 17 -> 8)
 * - Semestral: R$ 62,90 (6+2+9+0 = 17 -> 8)
 * - Anual:     R$ 89,90 (8+9+9+0 = 26 -> 8)
 */
const TIERS: readonly PlanTier[] = [
  {
    id: 'MONTHLY',
    name: 'Mensal',
    monthlyPrice: 'R$ 12,95',
    totalPrice: 'Cobrado mensalmente (Cartão ou Pix)',
    amountCents: 1295,
    subtitle: 'Flexibilidade total para seu controle',
  },
  {
    id: 'SEMIANNUAL',
    name: 'Semestral',
    monthlyPrice: 'R$ 10,48',
    totalPrice: 'Total R$ 62,90 a cada 6 meses',
    amountCents: 6290,
    discountBadge: 'Economize 19%',
    subtitle: 'Equilíbrio ideal entre economia e prazo',
  },
  {
    id: 'ANNUAL',
    name: 'Anual',
    monthlyPrice: 'R$ 7,49',
    totalPrice: 'Total R$ 89,90 por ano (Pix ou Cartão)',
    amountCents: 8990,
    discountBadge: 'Economize 42%',
    popular: true,
    subtitle: 'Menos de R$ 0,25 por dia',
  },
];

const BENEFITS = [
  'Visualização liberada de todos os meses passados e futuros na Fila e no Painel',
  'Exportação de Relatórios Executivos em PDF (Sintético e Analítico) e CSV',
  'Gráfico completo da Evolução Anual (12 meses)',
  'Criação ilimitada de Categorias personalizadas',
  'Adição de membros e participantes com acesso compartilhado para quitar e gerenciar contas',
];

export function PlansPage(): JSX.Element {
  const { user } = useAuth();
  const { plan, openMaintenanceModal, refetchPlan } = usePlan();
  const [searchParams, setSearchParams] = useSearchParams();

  const [monthlyMode, setMonthlyMode] = useState<'CARD_RECURRING' | 'PIX_ONCE'>(
    'CARD_RECURRING',
  );
  const [summary, setSummary] = useState<FamilySubscriptionSummary | null>(null);
  const [selectedTier, setSelectedTier] = useState<PlanTier | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [confirmRefundOpen, setConfirmRefundOpen] = useState<boolean>(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState<boolean>(false);
  const [bannerMessage, setBannerMessage] = useState<{
    type: 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);

  const isPaidPremium = plan?.status === 'PREMIUM';
  const isAdmin = user?.role === Role.ADMIN;

  const loadSubscriptionSummary = async (): Promise<void> => {
    try {
      const data = await planApi.subscriptionSummary();
      setSummary(data);
    } catch {
      // ignora silenciosamente caso offline
    }
  };

  useEffect(() => {
    void loadSubscriptionSummary();
  }, []);

  // Verifica retorno do checkout do Mercado Pago (?payment=success|failure|pending&tx=...)
  useEffect(() => {
    const paymentResult = searchParams.get('payment');
    const txId = searchParams.get('tx');
    if (!paymentResult) return;

    const cleanParams = (): void => {
      searchParams.delete('payment');
      searchParams.delete('tx');
      setSearchParams(searchParams, { replace: true });
    };

    if (paymentResult === 'failure') {
      setBannerMessage({
        type: 'error',
        text: 'O pagamento não foi concluído no Mercado Pago. Você pode tentar novamente quando quiser.',
      });
      cleanParams();
      return;
    }

    if (txId) {
      void (async () => {
        try {
          const synced = await planApi.syncTransaction(txId);
          await refetchPlan();
          await loadSubscriptionSummary();
          if (synced.status === 'APPROVED') {
            setBannerMessage({
              type: 'success',
              text: 'Pagamento aprovado! Seu plano 👑 Premium já está ativo para toda a sua conta.',
            });
          } else {
            setBannerMessage({
              type: 'warning',
              text: 'Recebemos seu pedido! Assim que o Mercado Pago confirmar a compensação, seu plano Premium será liberado automaticamente.',
            });
          }
        } catch {
          setBannerMessage({
            type: 'warning',
            text: 'Aguardando confirmação automática do Mercado Pago.',
          });
        } finally {
          cleanParams();
        }
      })();
    } else {
      cleanParams();
    }
  }, [searchParams, setSearchParams, refetchPlan]);

  const handleSelectTier = (tier: PlanTier): void => {
    setBannerMessage(null);
    if (summary && !summary.paymentsEnabled) {
      openMaintenanceModal();
      return;
    }
    setAcceptedTerms(false);
    setSelectedTier(tier);
  };

  const handleProceedCheckout = async (): Promise<void> => {
    if (!selectedTier || !acceptedTerms) return;
    setSubmitting(true);
    setBannerMessage(null);

    const paymentMode: CheckoutPaymentMode =
      selectedTier.id === 'MONTHLY' ? monthlyMode : 'CHECKOUT_PRO';

    try {
      const session = await planApi.createCheckout({
        billingCycle: selectedTier.id,
        paymentMode,
        acceptedTerms: true,
      });
      window.location.href = session.checkoutUrl;
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        setSelectedTier(null);
        openMaintenanceModal();
        return;
      }
      setBannerMessage({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Não foi possível iniciar o pagamento no Mercado Pago.',
      });
      setSelectedTier(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmCancelRecurring = async (): Promise<void> => {
    setActionLoading(true);
    try {
      const res = await planApi.cancelSubscription();
      setConfirmCancelOpen(false);
      await refetchPlan();
      await loadSubscriptionSummary();
      setBannerMessage({ type: 'success', text: res.message });
    } catch (err) {
      setBannerMessage({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Não foi possível cancelar a renovação automática.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmCdcRefund = async (): Promise<void> => {
    setActionLoading(true);
    try {
      const res = await planApi.requestCdcRefund();
      setConfirmRefundOpen(false);
      await refetchPlan();
      await loadSubscriptionSummary();
      setBannerMessage({ type: 'success', text: res.message });
    } catch (err) {
      setBannerMessage({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Não foi possível processar o reembolso automático.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-6 pb-12 pt-2">
      <header className="flex flex-col items-center gap-2.5 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/15 px-3.5 py-1 text-xs font-bold text-amber-300 shadow-sm">
          <Crown className="h-3.5 w-3.5 text-amber-400" />
          Aksurim Controle · Premium
        </span>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Controle financeiro inteligente, individual ou compartilhado
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Planeje todos os meses do ano, gere relatórios profissionais em PDF e compartilhe a gestão de contas com sua família, amigos, república ou parceiros por menos de R$ 0,25 ao dia.
        </p>

        {isPaidPremium && (
          <div className="mt-1 inline-flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-2.5 text-xs font-semibold text-emerald-200">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>
              Sua conta já possui o plano 👑 Premium ativo ({plan?.daysLeft ?? 0} dias restantes).
            </span>
          </div>
        )}

        {bannerMessage && (
          <div
            role="alert"
            className={cn(
              'mt-2 w-full max-w-2xl rounded-xl border px-4 py-3 text-xs font-medium text-left',
              bannerMessage.type === 'success'
                ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200'
                : bannerMessage.type === 'warning'
                  ? 'border-amber-400/50 bg-amber-500/15 text-amber-100'
                  : 'border-rose-500/50 bg-rose-500/15 text-rose-200',
            )}
          >
            {bannerMessage.text}
          </div>
        )}
      </header>

      {/* Cards de Planos */}
      <div className="grid grid-cols-1 gap-5 pt-2 md:grid-cols-3">
        {TIERS.map((tier) => {
          const isMonthly = tier.id === 'MONTHLY';

          return (
            <Card
              key={tier.id}
              className={cn(
                'relative flex flex-col justify-between transition-all',
                tier.popular
                  ? 'border-2 border-amber-400/90 bg-gradient-to-b from-amber-500/[0.08] to-card shadow-lg shadow-amber-500/10'
                  : 'border-border bg-card',
              )}
            >
              {tier.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-950 shadow-md">
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3 w-3 fill-slate-950" /> Mais escolhido
                  </span>
                </div>
              )}

              <CardContent className="flex flex-1 flex-col justify-between gap-5 p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg font-bold text-foreground">{tier.name}</h2>
                    {tier.discountBadge ? (
                      <span className="whitespace-nowrap rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                        {tier.discountBadge}
                      </span>
                    ) : null}
                  </div>

                  <p className="text-xs text-muted-foreground">{tier.subtitle}</p>

                  <div className="pt-1 space-y-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-foreground">
                        {tier.monthlyPrice}
                      </span>
                      <span className="text-xs text-muted-foreground">/mês</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{tier.totalPrice}</p>
                  </div>

                  {/* Seletor de modalidade no Plano Mensal (D4: Renovação automática selecionada por padrão com aviso claro) */}
                  {isMonthly && (
                    <div className="pt-2 space-y-2">
                      <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-border bg-muted/40 p-1">
                        <button
                          type="button"
                          onClick={() => setMonthlyMode('CARD_RECURRING')}
                          className={cn(
                            'flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-all',
                            monthlyMode === 'CARD_RECURRING'
                              ? 'bg-card text-amber-300 shadow-sm border border-amber-400/40'
                              : 'text-muted-foreground hover:text-foreground',
                          )}
                        >
                          <CreditCard className="h-3 w-3 shrink-0" />
                          Cartão (Auto)
                        </button>
                        <button
                          type="button"
                          onClick={() => setMonthlyMode('PIX_ONCE')}
                          className={cn(
                            'flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-all',
                            monthlyMode === 'PIX_ONCE'
                              ? 'bg-card text-emerald-300 shadow-sm border border-emerald-400/40'
                              : 'text-muted-foreground hover:text-foreground',
                          )}
                        >
                          <QrCode className="h-3 w-3 shrink-0" />
                          Pix (30 dias)
                        </button>
                      </div>

                      <p className="text-[11px] leading-snug text-muted-foreground">
                        {monthlyMode === 'CARD_RECURRING' ? (
                          <>
                            🔄 <strong>Renovação automática mensal</strong> de R$ 12,95 no cartão. Aviso 3 dias antes e cancelamento em 1 clique sem multa.
                          </>
                        ) : (
                          <>
                            ⚡ <strong>Pagamento único via Pix</strong> por 30 dias de acesso, sem débito automático. Enviamos lembrete perto do vencimento.
                          </>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                <Button
                  type="button"
                  onClick={() => handleSelectTier(tier)}
                  disabled={!isAdmin}
                  className={cn(
                    'w-full font-bold transition-all',
                    tier.popular
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-md hover:brightness-110'
                      : 'hover:border-amber-400/50 hover:text-amber-200',
                  )}
                  variant={tier.popular ? 'default' : 'outline'}
                >
                  <Crown className="mr-1.5 h-4 w-4" />
                  {isPaidPremium ? `Renovar ${tier.name}` : `Assinar ${tier.name}`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Lista de Benefícios */}
      <Card className="border-border/80 bg-card/90">
        <CardContent className="p-6">
          <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
            <Crown className="h-4 w-4 text-amber-400" />
            Tudo o que está incluído no Premium
          </h3>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2.5 text-sm text-foreground/90">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Autoatendimento de Cancelamento (1 clique) e Reembolso CDC (7 dias) */}
      {isAdmin && (summary?.canCancelRecurring || summary?.canRequestCdcRefund) && (
        <Card className="border-border/70 bg-card/60">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 text-xs">
              <p className="font-semibold text-foreground">
                Gestão da sua assinatura
              </p>
              <p className="text-muted-foreground">
                {summary.canRequestCdcRefund && summary.cdcRefundDeadline
                  ? `Direito de arrependimento (CDC Art. 49) disponível até ${formatDate(
                      summary.cdcRefundDeadline,
                    )}.`
                  : 'Você pode cancelar a renovação automática a qualquer momento, sem multa.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {summary.canCancelRecurring && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmCancelOpen(true)}
                  className="text-xs"
                >
                  <XCircle className="mr-1.5 h-3.5 w-3.5" />
                  Cancelar renovação automática
                </Button>
              )}
              {summary.canRequestCdcRefund && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmRefundOpen(true)}
                  className="border-rose-500/40 text-xs text-rose-300 hover:bg-rose-500/15"
                >
                  <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
                  Cancelar e pedir reembolso (7 dias)
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rodapé discreto com acesso aos documentos legais */}
      <div className="pt-1 text-center text-xs text-muted-foreground/70">
        Pagamento 100% seguro processado pelo Mercado Pago ·{' '}
        <Link to="/termos" className="underline-offset-4 hover:underline">
          Termos de Uso
        </Link>{' '}
        ·{' '}
        <Link to="/privacidade" className="underline-offset-4 hover:underline">
          Privacidade (LGPD)
        </Link>{' '}
        ·{' '}
        <Link to="/reembolso" className="underline-offset-4 hover:underline">
          Cancelamento e Reembolso
        </Link>
      </div>

      {/* Modal de confirmação antes de redirecionar ao Mercado Pago */}
      <Dialog
        open={Boolean(selectedTier)}
        onOpenChange={(open) => {
          if (!open && !submitting) setSelectedTier(null);
        }}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Confirmar Plano {selectedTier?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Você será redirecionado ao ambiente seguro do <strong>Mercado Pago</strong> para concluir o pagamento.
            </DialogDescription>
          </DialogHeader>

          {selectedTier && (
            <div className="space-y-3 py-1 text-xs">
              <div className="rounded-lg border border-border bg-muted/40 p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Plano selecionado:</span>
                  <strong className="text-foreground">
                    👑 Premium {selectedTier.name}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Modalidade:</span>
                  <strong className="text-foreground">
                    {selectedTier.id === 'MONTHLY'
                      ? monthlyMode === 'CARD_RECURRING'
                        ? 'Cartão (Renovação automática mensal)'
                        : 'Pix avulso (30 dias)'
                      : 'Pagamento único (Pix ou Cartão)'}
                  </strong>
                </div>
                <div className="flex items-center justify-between border-t border-border/60 pt-1.5 text-sm">
                  <span className="font-semibold text-foreground">Total:</span>
                  <strong className="text-amber-400">
                    {formatCurrency(selectedTier.amountCents)}
                  </strong>
                </div>
              </div>

              {selectedTier.id === 'MONTHLY' && monthlyMode === 'CARD_RECURRING' && (
                <p className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-100/90">
                  🔄 O valor de <strong>R$ 12,95</strong> será renovado automaticamente a cada mês no cartão cadastrado. Você receberá um lembrete 3 dias antes e pode cancelar quando quiser em 1 clique, sem fidelidade.
                </p>
              )}

              <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border p-3 text-xs">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-input accent-amber-400"
                />
                <span className="text-muted-foreground leading-snug">
                  Li e concordo com os{' '}
                  <Link
                    to="/termos"
                    className="font-medium text-foreground underline underline-offset-2"
                  >
                    Termos de Uso
                  </Link>{' '}
                  e com a{' '}
                  <Link
                    to="/reembolso"
                    className="font-medium text-foreground underline underline-offset-2"
                  >
                    Política de Cancelamento e Reembolso (7 dias CDC)
                  </Link>
                  .
                </span>
              </label>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => setSelectedTier(null)}
              className="w-full sm:w-auto"
            >
              Voltar
            </Button>
            <Button
              type="button"
              disabled={!acceptedTerms || submitting}
              onClick={() => void handleProceedCheckout()}
              className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 font-bold text-slate-950 hover:brightness-110 sm:flex-1"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Abrindo Mercado Pago...
                </>
              ) : (
                <>
                  <Crown className="mr-1.5 h-4 w-4" />
                  Ir para o pagamento seguro
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação de Cancelamento de Renovação */}
      <Dialog open={confirmCancelOpen} onOpenChange={setConfirmCancelOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Cancelar renovação automática?</DialogTitle>
            <DialogDescription className="text-xs">
              Nenhuma nova cobrança será feita nos próximos meses e você continuará com acesso 👑 Premium até o último dia do período já pago.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              disabled={actionLoading}
              onClick={() => setConfirmCancelOpen(false)}
            >
              Manter assinatura
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={actionLoading}
              onClick={() => void handleConfirmCancelRecurring()}
            >
              {actionLoading ? 'Cancelando...' : 'Confirmar cancelamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação de Reembolso Automático 7 dias (CDC Art. 49) */}
      <Dialog open={confirmRefundOpen} onOpenChange={setConfirmRefundOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full border border-amber-400/40 bg-amber-500/15 text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle className="text-center">
              Solicitar reembolso integral (7 dias)?
            </DialogTitle>
            <DialogDescription className="text-center text-xs">
              O valor de{' '}
              <strong>
                {formatCurrency(summary?.refundableAmountCents ?? 0)}
              </strong>{' '}
              será estornado automaticamente pelo Mercado Pago e sua conta voltará ao Plano Gratuito (preservando todos os seus dados).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              disabled={actionLoading}
              onClick={() => setConfirmRefundOpen(false)}
            >
              Voltar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={actionLoading}
              onClick={() => void handleConfirmCdcRefund()}
            >
              {actionLoading ? 'Estornando...' : 'Confirmar reembolso integral'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
