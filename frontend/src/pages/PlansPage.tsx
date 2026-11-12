import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  Copy,
  CreditCard,
  Crown,
  Lock,
  Loader2,
  QrCode,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePlan } from '@/contexts/PlanContext';
import { useAuth } from '@/hooks/useAuth';
import {
  ApiError,
  planApi,
  type BillingCycle,
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
  maxInstallments: number;
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
    totalPrice: 'Cobrado mensalmente',
    amountCents: 1295,
    maxInstallments: 1,
    subtitle: 'Flexibilidade total para seu controle',
  },
  {
    id: 'SEMIANNUAL',
    name: 'Semestral',
    monthlyPrice: 'R$ 10,48',
    totalPrice: 'Total R$ 62,90 a cada 6 meses',
    amountCents: 6290,
    maxInstallments: 6,
    discountBadge: 'Economize 19%',
    subtitle: 'Equilíbrio ideal entre economia e prazo',
  },
  {
    id: 'ANNUAL',
    name: 'Anual',
    monthlyPrice: 'R$ 7,49',
    totalPrice: 'Total R$ 89,90 por ano',
    amountCents: 8990,
    maxInstallments: 12,
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

function detectCardBrand(cardNumberDigits: string): {
  id: string;
  label: string;
} {
  const n = cardNumberDigits.replace(/\D/g, '');
  if (!n) return { id: '', label: '' };
  if (/^(4011|4312|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650|6516|6550)/.test(n)) {
    return { id: 'elo', label: 'ELO' };
  }
  if (/^(606282|3841)/.test(n)) {
    return { id: 'hipercard', label: 'HIPERCARD' };
  }
  if (/^3[47]/.test(n)) {
    return { id: 'amex', label: 'AMEX' };
  }
  if (/^(5[1-5]|2[2-7])/.test(n)) {
    return { id: 'master', label: 'MASTERCARD' };
  }
  if (/^4/.test(n)) {
    return { id: 'visa', label: 'VISA' };
  }
  return { id: '', label: 'CARTÃO' };
}

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return digits;
}

function formatCpfMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function PlansPage(): JSX.Element {
  const { user } = useAuth();
  const { plan, openMaintenanceModal, refetchPlan } = usePlan();
  const [searchParams, setSearchParams] = useSearchParams();

  const [summary, setSummary] = useState<FamilySubscriptionSummary | null>(null);
  const [selectedTier, setSelectedTier] = useState<PlanTier | null>(null);
  const [paymentTab, setPaymentTab] = useState<'PIX' | 'CARD'>('PIX');
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Estado do Pix Transparente no Modal
  const [pixSession, setPixSession] = useState<{
    transactionId: string;
    qrCode: string | null;
    qrCodeBase64: string | null;
  } | null>(null);
  const [pixCopied, setPixCopied] = useState<boolean>(false);
  const [checkingPix, setCheckingPix] = useState<boolean>(false);

  // Estado do Cartão de Crédito Transparente (Tokenizado via PCI-DSS no navegador)
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardholderName, setCardholderName] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvv, setCardCvv] = useState<string>('');
  const [cardCpf, setCardCpf] = useState<string>('');
  const [cardInstallments, setCardInstallments] = useState<number>(1);

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
      if (data.ownerCpf) {
        setCardCpf((prev) => prev || formatCpfMask(data.ownerCpf));
      }
      await refetchPlan();
    } catch {
      // ignora silenciosamente caso offline
    }
  };

  useEffect(() => {
    void loadSubscriptionSummary();
  }, []);

  // Polling automático a cada 4 segundos enquanto o QR Code Pix estiver aberto no modal
  useEffect(() => {
    if (!pixSession?.transactionId || !selectedTier) return;

    const timer = window.setInterval(() => {
      void (async () => {
        try {
          const synced = await planApi.syncTransaction(pixSession.transactionId);
          if (synced.status === 'APPROVED') {
            window.clearInterval(timer);
            setPixSession(null);
            setSelectedTier(null);
            await refetchPlan();
            await loadSubscriptionSummary();
            setBannerMessage({
              type: 'success',
              text: 'Pagamento Pix confirmado! Seu plano 👑 Premium já está ativo para toda a sua conta.',
            });
          }
        } catch {
          // ignora erros transitórios de rede durante o polling
        }
      })();
    }, 4000);

    return () => window.clearInterval(timer);
  }, [pixSession?.transactionId, selectedTier, refetchPlan]);

  // Verifica retorno legado do checkout do Mercado Pago (?payment=success|failure|pending&tx=...)
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
        text: 'O pagamento não foi concluído. Você pode tentar novamente quando quiser.',
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

  const resetModalState = (tier: PlanTier | null): void => {
    setSelectedTier(tier);
    setPaymentTab('PIX');
    setAcceptedTerms(false);
    setModalError(null);
    setPixSession(null);
    setPixCopied(false);
    setCardNumber('');
    setCardholderName(user?.name ? user.name.toUpperCase() : '');
    setCardExpiry('');
    setCardCvv('');
    setCardInstallments(1);
    if (summary?.ownerCpf) {
      setCardCpf(formatCpfMask(summary.ownerCpf));
    }
  };

  const handleSelectTier = (tier: PlanTier): void => {
    setBannerMessage(null);
    if (summary && !summary.paymentsEnabled) {
      openMaintenanceModal();
      return;
    }
    resetModalState(tier);
  };

  const handleGeneratePix = async (): Promise<void> => {
    if (!selectedTier || !acceptedTerms) return;
    setSubmitting(true);
    setModalError(null);

    try {
      const session = await planApi.createCheckout({
        billingCycle: selectedTier.id,
        paymentMode: 'PIX_DIRECT',
        acceptedTerms: true,
        payerCpf: cardCpf.replace(/\D/g, '') || summary?.ownerCpf || undefined,
      });

      setPixSession({
        transactionId: session.transactionId,
        qrCode: session.pixQrCode ?? null,
        qrCodeBase64: session.pixQrCodeBase64 ?? null,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        setSelectedTier(null);
        openMaintenanceModal();
        return;
      }
      setModalError(
        err instanceof Error
          ? err.message
          : 'Não foi possível gerar o QR Code Pix no momento.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyPixCode = async (): Promise<void> => {
    if (!pixSession?.qrCode) return;
    try {
      await navigator.clipboard.writeText(pixSession.qrCode);
      setPixCopied(true);
      window.setTimeout(() => setPixCopied(false), 3000);
    } catch {
      // ignora falha de clipboard
    }
  };

  const handleManualCheckPix = async (): Promise<void> => {
    if (!pixSession?.transactionId) return;
    setCheckingPix(true);
    setModalError(null);
    try {
      const synced = await planApi.syncTransaction(pixSession.transactionId);
      if (synced.status === 'APPROVED') {
        setPixSession(null);
        setSelectedTier(null);
        await refetchPlan();
        await loadSubscriptionSummary();
        setBannerMessage({
          type: 'success',
          text: 'Pagamento Pix confirmado! Seu plano 👑 Premium já está ativo para toda a sua conta.',
        });
      } else {
        setModalError(
          'Ainda aguardando a confirmação do banco. Assim que você concluir o Pix no app do seu banco, a liberação ocorre em segundos.',
        );
      }
    } catch {
      setModalError('Não foi possível verificar o status agora. Tente novamente em instantes.');
    } finally {
      setCheckingPix(false);
    }
  };

  /**
   * Tokeniza os dados do cartão diretamente no cofre PCI-DSS do Mercado Pago
   * (`https://api.mercadopago.com/v1/card_tokens`) a partir do navegador do cliente.
   * Os dados brutos do cartão NUNCA passam pelo servidor da Aksurim.
   */
  const handlePayWithCard = async (): Promise<void> => {
    if (!selectedTier || !acceptedTerms) return;
    setModalError(null);

    const digits = cardNumber.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) {
      setModalError('Informe um número de cartão de crédito válido.');
      return;
    }

    if (cardholderName.trim().length < 3) {
      setModalError('Informe o nome impresso no cartão.');
      return;
    }

    const expiryParts = cardExpiry.split('/');
    const expMonth = Number(expiryParts[0]);
    const rawYear = expiryParts[1] ?? '';
    const expYear =
      rawYear.length === 2 ? 2000 + Number(rawYear) : Number(rawYear);

    if (
      !expMonth ||
      expMonth < 1 ||
      expMonth > 12 ||
      !expYear ||
      expYear < new Date().getFullYear()
    ) {
      setModalError('Informe uma data de validade válida no formato MM/AA.');
      return;
    }

    const cleanCvv = cardCvv.replace(/\D/g, '');
    if (cleanCvv.length < 3 || cleanCvv.length > 4) {
      setModalError('Informe o código de segurança (CVV) de 3 ou 4 dígitos.');
      return;
    }

    const cleanCpf = cardCpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      setModalError('Informe o CPF válido (11 dígitos) do titular do cartão.');
      return;
    }

    const publicKey = summary?.mpPublicKey?.trim();
    if (!publicKey) {
      setModalError(
        'Chave pública de criptografia do Mercado Pago não encontrada. Utilize a aba Pix ou contate o suporte.',
      );
      return;
    }

    setSubmitting(true);

    try {
      // 1. Tokenização direta no cofre PCI-DSS do Mercado Pago
      const tokenRes = await fetch(
        `https://api.mercadopago.com/v1/card_tokens?public_key=${encodeURIComponent(
          publicKey,
        )}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            card_number: digits,
            cardholder: {
              name: cardholderName.trim(),
              identification: {
                type: 'CPF',
                number: cleanCpf,
              },
            },
            expiration_month: expMonth,
            expiration_year: expYear,
            security_code: cleanCvv,
          }),
        },
      );

      if (!tokenRes.ok) {
        setModalError(
          'Dados do cartão inválidos ou recusados na validação de segurança. Verifique o número, validade e CVV.',
        );
        return;
      }

      const tokenData = (await tokenRes.json()) as { id?: string };
      if (!tokenData?.id) {
        setModalError('Não foi possível criptografar o cartão. Verifique os dados.');
        return;
      }

      const brand = detectCardBrand(digits);

      // 2. Envia apenas o token descartável de uso único para o backend
      const session = await planApi.createCheckout({
        billingCycle: selectedTier.id,
        paymentMode: 'CARD_DIRECT',
        acceptedTerms: true,
        cardToken: tokenData.id,
        paymentMethodId: brand.id || undefined,
        installments: cardInstallments,
        payerCpf: cleanCpf,
      });

      // Limpa imediatamente os dados sensíveis da memória do navegador
      setCardNumber('');
      setCardCvv('');

      if (session.status === 'APPROVED') {
        setSelectedTier(null);
        await refetchPlan();
        await loadSubscriptionSummary();
        setBannerMessage({
          type: 'success',
          text: 'Pagamento aprovado no cartão! Seu plano 👑 Premium já está ativo para toda a sua conta.',
        });
      } else {
        setSelectedTier(null);
        await refetchPlan();
        await loadSubscriptionSummary();
        setBannerMessage({
          type: 'warning',
          text: 'Seu pagamento com cartão está em análise de segurança pela operadora e será liberado automaticamente assim que confirmado.',
        });
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        setSelectedTier(null);
        openMaintenanceModal();
        return;
      }
      setModalError(
        err instanceof Error
          ? err.message
          : 'Não foi possível processar o cartão. Verifique os dados ou utilize o Pix.',
      );
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

  const detectedBrand = detectCardBrand(cardNumber);

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
        Pagamento 100% seguro com criptografia PCI-DSS processado pelo Mercado Pago ·{' '}
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

      {/* Modal de Checkout Transparente Nativo (Pix QR Code + Cartão PCI-DSS sem sair da tela) */}
      <Dialog
        open={Boolean(selectedTier)}
        onOpenChange={(open) => {
          if (!open && !submitting) resetModalState(null);
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[490px]">
          <DialogHeader className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="flex items-center gap-2 text-lg font-extrabold text-foreground">
                <Crown className="h-5 w-5 text-amber-400" />
                Assinar Plano {selectedTier?.name}
              </DialogTitle>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                <Lock className="h-3 w-3" /> Ambiente Seguro
              </span>
            </div>
            <DialogDescription className="text-xs">
              Escolha a forma de pagamento para ativar imediatamente o seu acesso Premium.
            </DialogDescription>
          </DialogHeader>

          {selectedTier && (
            <div className="space-y-4 py-1 text-xs">
              {/* Resumo compacto do Plano */}
              <div className="flex items-center justify-between rounded-xl border border-amber-400/30 bg-gradient-to-r from-amber-500/10 via-card to-card px-4 py-3">
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Plano selecionado
                  </p>
                  <p className="text-sm font-bold text-foreground">
                    👑 Aksurim Controle Premium · {selectedTier.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Valor total
                  </p>
                  <p className="text-base font-extrabold text-amber-400">
                    {formatCurrency(selectedTier.amountCents)}
                  </p>
                </div>
              </div>

              {/* Abas de escolha: Pix vs Cartão de Crédito */}
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-muted/40 p-1">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setPaymentTab('PIX');
                    setModalError(null);
                  }}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition-all',
                    paymentTab === 'PIX'
                      ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/50 shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <QrCode className="h-4 w-4 text-emerald-400" />
                  Pix
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setPaymentTab('CARD');
                    setModalError(null);
                  }}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition-all',
                    paymentTab === 'CARD'
                      ? 'bg-amber-500/20 text-amber-200 border border-amber-400/50 shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <CreditCard className="h-4 w-4 text-amber-400" />
                  Cartão de Crédito
                </button>
              </div>

              {modalError && (
                <div className="rounded-lg border border-rose-500/50 bg-rose-500/15 px-3.5 py-2.5 text-xs font-medium text-rose-200">
                  {modalError}
                </div>
              )}

              {/* ABA 1: PIX TRANSPARENTE */}
              {paymentTab === 'PIX' && (
                <div className="space-y-3">
                  {!pixSession ? (
                    <div className="rounded-xl border border-border/80 bg-card/70 p-4 space-y-2.5">
                      <div className="flex items-start gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                          <Sparkles className="h-4 w-4" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="font-bold text-foreground">
                            Liberação instantânea via Pix
                          </p>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            Gere o QR Code ou utilize o código Pix Copia e Cola. A confirmação e a ativação do plano ocorrem automaticamente em segundos.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 rounded-xl border border-emerald-400/40 bg-emerald-500/[0.06] p-4 text-center">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-bold text-emerald-300">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Aguardando confirmação do pagamento...
                      </span>

                      {pixSession.qrCodeBase64 && (
                        <div className="rounded-xl bg-white p-3 shadow-md">
                          <img
                            src={`data:image/png;base64,${pixSession.qrCodeBase64}`}
                            alt="QR Code Pix"
                            className="h-44 w-44 object-contain"
                          />
                        </div>
                      )}

                      <p className="max-w-xs text-[11px] text-muted-foreground">
                        Escaneie o QR Code acima ou utilize o código <strong>Pix Copia e Cola</strong> abaixo:
                      </p>

                      {pixSession.qrCode && (
                        <div className="flex w-full flex-col gap-2">
                          <div className="flex items-center gap-1.5">
                            <Input
                              readOnly
                              value={pixSession.qrCode}
                              className="h-9 font-mono text-[11px] bg-background/80"
                            />
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => void handleCopyPixCode()}
                              className="shrink-0 bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400"
                            >
                              {pixCopied ? (
                                <>
                                  <Check className="mr-1 h-3.5 w-3.5" />
                                  Copiado!
                                </>
                              ) : (
                                <>
                                  <Copy className="mr-1 h-3.5 w-3.5" />
                                  Copiar Pix
                                </>
                              )}
                            </Button>
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={checkingPix}
                            onClick={() => void handleManualCheckPix()}
                            className="w-full border-emerald-400/40 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/15"
                          >
                            {checkingPix ? (
                              <>
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                Verificando compensação...
                              </>
                            ) : (
                              <>
                                <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-400" />
                                Já realizei o pagamento Pix
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ABA 2: CARTÃO DE CRÉDITO TRANSPARENTE (PCI-DSS) */}
              {paymentTab === 'CARD' && (
                <div className="space-y-3 rounded-xl border border-border/80 bg-card/70 p-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="cc-number" className="text-xs font-semibold">
                        Número do Cartão
                      </Label>
                      {detectedBrand.label && (
                        <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-extrabold text-amber-300">
                          {detectedBrand.label}
                        </span>
                      )}
                    </div>
                    <Input
                      id="cc-number"
                      type="text"
                      inputMode="numeric"
                      autoComplete="cc-number"
                      placeholder="0000 0000 0000 0000"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      className="h-9 font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="cc-name" className="text-xs font-semibold">
                      Nome impresso no cartão
                    </Label>
                    <Input
                      id="cc-name"
                      type="text"
                      autoComplete="cc-name"
                      placeholder="COMO ESTÁ NO CARTÃO"
                      value={cardholderName}
                      onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
                      className="h-9 text-xs uppercase"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="cc-exp" className="text-xs font-semibold">
                        Validade (MM/AA)
                      </Label>
                      <Input
                        id="cc-exp"
                        type="text"
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        placeholder="MM/AA"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                        className="h-9 font-mono text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="cc-cvv" className="text-xs font-semibold">
                        CVV (3 ou 4 dígitos)
                      </Label>
                      <Input
                        id="cc-cvv"
                        type="password"
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        placeholder="123"
                        maxLength={4}
                        value={cardCvv}
                        onChange={(e) =>
                          setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))
                        }
                        className="h-9 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="cc-cpf" className="text-xs font-semibold">
                        CPF do titular do cartão
                      </Label>
                      <Input
                        id="cc-cpf"
                        type="text"
                        inputMode="numeric"
                        placeholder="000.000.000-00"
                        value={cardCpf}
                        onChange={(e) => setCardCpf(formatCpfMask(e.target.value))}
                        className="h-9 font-mono text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="cc-installments" className="text-xs font-semibold">
                        Parcelamento
                      </Label>
                      <select
                        id="cc-installments"
                        value={cardInstallments}
                        onChange={(e) => setCardInstallments(Number(e.target.value))}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs font-medium text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value={1}>
                          1x de {formatCurrency(selectedTier.amountCents)} (à vista)
                        </option>
                        {selectedTier.maxInstallments > 1 &&
                          Array.from(
                            { length: selectedTier.maxInstallments - 1 },
                            (_, idx) => idx + 2,
                          ).map((n) => (
                            <option key={n} value={n}>
                              Em {n}x no cartão
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <p className="flex items-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
                    <Lock className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    Transação protegida com criptografia ponta a ponta (Padrão Internacional PCI-DSS).
                  </p>
                </div>
              )}

              {/* Aceite dos Termos (exibido quando ainda não gerou o QR Code Pix) */}
              {!pixSession && (
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
              )}
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => resetModalState(null)}
              className="w-full sm:w-auto"
            >
              Fechar
            </Button>

            {paymentTab === 'PIX' && !pixSession && (
              <Button
                type="button"
                disabled={!acceptedTerms || submitting}
                onClick={() => void handleGeneratePix()}
                className="w-full bg-gradient-to-r from-emerald-400 to-teal-500 font-bold text-slate-950 hover:brightness-110 sm:flex-1"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Gerando QR Code Pix...
                  </>
                ) : (
                  <>
                    <QrCode className="mr-1.5 h-4 w-4" />
                    Gerar QR Code Pix ({formatCurrency(selectedTier?.amountCents ?? 0)})
                  </>
                )}
              </Button>
            )}

            {paymentTab === 'CARD' && (
              <Button
                type="button"
                disabled={!acceptedTerms || submitting}
                onClick={() => void handlePayWithCard()}
                className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 font-bold text-slate-950 hover:brightness-110 sm:flex-1"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Processando pagamento seguro...
                  </>
                ) : (
                  <>
                    <Lock className="mr-1.5 h-4 w-4" />
                    Pagar {formatCurrency(selectedTier?.amountCents ?? 0)} no Cartão
                  </>
                )}
              </Button>
            )}
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
