import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { BillingCycle, Role } from '@prisma/client';

import { AuthenticatedUser } from '../auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { AdminRefundDto } from './dto/admin-refund.dto';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import {
  CDC_REFUND_WINDOW_DAYS,
  CheckoutPaymentMode,
  DAY_MS,
  PLAN_EQUIVALENT_MONTHLY_CENTS,
  PLAN_PRICES_CENTS,
  SubscriptionTxStatus,
  TERMS_CURRENT_VERSION,
} from './plan.constants';
import { PlanInfo, PlanService } from './plan.service';

export interface PlanPricingItem {
  id: BillingCycle;
  name: string;
  amountCents: number;
  equivalentMonthlyCents: number;
  discountPercent: number;
  popular: boolean;
}

export interface SubscriptionTransactionRecord {
  id: string;
  familyAccountId: string;
  userId: string;
  billingCycle: BillingCycle;
  paymentMode: CheckoutPaymentMode;
  amountCents: number;
  status: SubscriptionTxStatus;
  mpPaymentId: string | null;
  mpPreapprovalId: string | null;
  mpPreferenceId: string | null;
  checkoutUrl: string | null;
  refundedAmountCents: number | null;
  refundedAt: Date | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminTransactionView extends SubscriptionTransactionRecord {
  familyName: string;
  userEmail: string;
  userName: string;
}

export interface FamilySubscriptionSummary {
  paymentsEnabled: boolean;
  mpPublicKey: string;
  ownerCpf: string;
  termsVersion: string;
  pricing: PlanPricingItem[];
  hasActiveRecurring: boolean;
  activePreapprovalId: string | null;
  canCancelRecurring: boolean;
  canRequestCdcRefund: boolean;
  cdcRefundDeadline: string | null;
  refundableTransactionId: string | null;
  refundableAmountCents: number | null;
  latestTransactions: Array<{
    id: string;
    billingCycle: BillingCycle;
    paymentMode: CheckoutPaymentMode;
    amountCents: number;
    status: SubscriptionTxStatus;
    refundedAmountCents: number | null;
    approvedAt: string | null;
    createdAt: string;
  }>;
}

export interface CheckoutSessionResult {
  transactionId: string;
  checkoutUrl: string;
  billingCycle: BillingCycle;
  paymentMode: CheckoutPaymentMode;
  amountCents: number;
  status?: SubscriptionTxStatus;
  pixQrCode?: string | null;
  pixQrCodeBase64?: string | null;
  plan?: PlanInfo;
}

interface MpPreferenceResponse {
  id: string;
  init_point: string;
  sandbox_init_point?: string;
}

interface MpPreapprovalResponse {
  id: string;
  init_point?: string;
  status?: string;
  external_reference?: string;
}

interface MpPaymentResponse {
  id: number | string;
  status: string;
  status_detail?: string;
  transaction_amount?: number;
  external_reference?: string;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
}

interface MpSearchPaymentsResponse {
  results?: Array<{
    id: number | string;
    status: string;
    external_reference?: string;
  }>;
}

@Injectable()
export class PlanPaymentService implements OnModuleInit {
  private readonly logger = new Logger(PlanPaymentService.name);
  private tableEnsured = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly planService: PlanService,
    private readonly mailerService: MailerService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureTableExists();
  }

  /**
   * Garante de forma aditiva e idempotente a existência da tabela
   * `subscription_transactions` sem alterar nenhuma tabela existente.
   */
  async ensureTableExists(): Promise<void> {
    if (this.tableEnsured) return;
    try {
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`subscription_transactions\` (
          \`id\` VARCHAR(36) NOT NULL,
          \`familyAccountId\` VARCHAR(36) NOT NULL,
          \`userId\` VARCHAR(36) NOT NULL,
          \`billingCycle\` VARCHAR(20) NOT NULL,
          \`paymentMode\` VARCHAR(20) NOT NULL,
          \`amountCents\` INT NOT NULL,
          \`status\` VARCHAR(30) NOT NULL DEFAULT 'PENDING',
          \`mpPaymentId\` VARCHAR(100) NULL,
          \`mpPreapprovalId\` VARCHAR(100) NULL,
          \`mpPreferenceId\` VARCHAR(100) NULL,
          \`checkoutUrl\` TEXT NULL,
          \`refundedAmountCents\` INT NULL,
          \`refundedAt\` DATETIME(3) NULL,
          \`approvedAt\` DATETIME(3) NULL,
          \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          PRIMARY KEY (\`id\`),
          INDEX \`idx_sub_tx_family\` (\`familyAccountId\`),
          INDEX \`idx_sub_tx_mp_payment\` (\`mpPaymentId\`),
          INDEX \`idx_sub_tx_mp_preapproval\` (\`mpPreapprovalId\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `);
      this.tableEnsured = true;
    } catch (err) {
      this.logger.warn(
        `Aviso ao verificar tabela subscription_transactions: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  /**
   * Verifica se os pagamentos online estão habilitados globalmente
   * (`PAYMENTS_ENABLED=true`) ou para o e-mail específico na allowlist
   * (`PAYMENTS_ALLOWLIST_EMAILS`).
   */
  isPaymentsEnabledForEmail(email?: string): boolean {
    const rawEnabled = (this.config.get<string>('PAYMENTS_ENABLED') ?? '')
      .trim()
      .toLowerCase();
    if (rawEnabled === 'true' || rawEnabled === '1') {
      return true;
    }

    if (!email) return false;
    const allowlistRaw = this.config.get<string>('PAYMENTS_ALLOWLIST_EMAILS') ?? '';
    const allowlist = allowlistRaw
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

    return allowlist.includes(email.trim().toLowerCase());
  }

  /**
   * Catálogo oficial de preços (fonte única da verdade em centavos — §8.2).
   */
  getPricingCatalog(): PlanPricingItem[] {
    return [
      {
        id: BillingCycle.MONTHLY,
        name: 'Mensal',
        amountCents: PLAN_PRICES_CENTS.MONTHLY,
        equivalentMonthlyCents: PLAN_EQUIVALENT_MONTHLY_CENTS.MONTHLY,
        discountPercent: 0,
        popular: false,
      },
      {
        id: BillingCycle.SEMIANNUAL,
        name: 'Semestral',
        amountCents: PLAN_PRICES_CENTS.SEMIANNUAL,
        equivalentMonthlyCents: PLAN_EQUIVALENT_MONTHLY_CENTS.SEMIANNUAL,
        discountPercent: 19,
        popular: false,
      },
      {
        id: BillingCycle.ANNUAL,
        name: 'Anual',
        amountCents: PLAN_PRICES_CENTS.ANNUAL,
        equivalentMonthlyCents: PLAN_EQUIVALENT_MONTHLY_CENTS.ANNUAL,
        discountPercent: 42,
        popular: true,
      },
    ];
  }

  /**
   * Reconcilia silenciosamente transações PENDING de uma família antes de retornar o plano.
   */
  async reconcileFamilyPending(familyAccountId: string): Promise<void> {
    try {
      await this.ensureTableExists();
      const txs = await this.findTransactionsByFamily(familyAccountId);
      await this.reconcilePendingTransactions(txs);
    } catch {
      // ignora silenciosamente caso offline
    }
  }

  /**
   * Retorna o resumo de assinatura, elegibilidade de reembolso CDC (7 dias)
   * e histórico da família autenticada.
   */
  async getFamilySubscriptionSummary(
    familyAccountId: string,
    userEmail?: string,
  ): Promise<FamilySubscriptionSummary> {
    await this.ensureTableExists();
    let txs = await this.findTransactionsByFamily(familyAccountId);

    const reconciled = await this.reconcilePendingTransactions(txs);
    if (reconciled) {
      txs = await this.findTransactionsByFamily(familyAccountId);
    }

    const family = await (
      this.prisma.familyAccount?.findUnique?.({
        where: { id: familyAccountId },
        select: { ownerCpf: true },
      }) ?? Promise.resolve(null)
    ).catch(() => null);

    const activeRecurringTx = txs.find(
      (t) =>
        t.paymentMode === 'CARD_RECURRING' &&
        Boolean(t.mpPreapprovalId) &&
        (t.status === 'APPROVED' || t.status === 'AUTHORIZED'),
    );

    const approvedTxs = txs
      .filter((t) => t.status === 'APPROVED' || t.status === 'REFUNDED')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const firstApproved = approvedTxs[0];
    let canRequestCdcRefund = false;
    let cdcRefundDeadline: string | null = null;
    let refundableTransactionId: string | null = null;
    let refundableAmountCents: number | null = null;

    if (
      firstApproved &&
      firstApproved.status === 'APPROVED' &&
      firstApproved.approvedAt &&
      !firstApproved.refundedAt
    ) {
      const deadlineMs =
        firstApproved.approvedAt.getTime() + CDC_REFUND_WINDOW_DAYS * DAY_MS;
      if (Date.now() <= deadlineMs) {
        canRequestCdcRefund = true;
        cdcRefundDeadline = new Date(deadlineMs).toISOString();
        refundableTransactionId = firstApproved.id;
        refundableAmountCents = firstApproved.amountCents;
      }
    }

    return {
      paymentsEnabled: this.isPaymentsEnabledForEmail(userEmail),
      mpPublicKey: (this.config.get<string>('MP_PUBLIC_KEY') ?? '').trim(),
      ownerCpf: family?.ownerCpf ?? '',
      termsVersion: TERMS_CURRENT_VERSION,
      pricing: this.getPricingCatalog(),
      hasActiveRecurring: Boolean(activeRecurringTx),
      activePreapprovalId: activeRecurringTx?.mpPreapprovalId ?? null,
      canCancelRecurring: Boolean(activeRecurringTx),
      canRequestCdcRefund,
      cdcRefundDeadline,
      refundableTransactionId,
      refundableAmountCents,
      latestTransactions: txs.slice(0, 10).map((t) => ({
        id: t.id,
        billingCycle: t.billingCycle,
        paymentMode: t.paymentMode,
        amountCents: t.amountCents,
        status: t.status,
        refundedAmountCents: t.refundedAmountCents,
        approvedAt: t.approvedAt ? t.approvedAt.toISOString() : null,
        createdAt: t.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Inicia o checkout no Mercado Pago:
   * - PIX_DIRECT: gera QR Code e Copia e Cola transparente dentro do modal (sem sair da página)
   * - CARD_DIRECT: processa cartão de crédito tokenizado via PCI-DSS dentro do modal (sem abrir app MP)
   * - Legado: Checkout Pro ou Preapproval
   */
  async createCheckout(
    familyAccountId: string,
    user: AuthenticatedUser,
    dto: CreateCheckoutDto,
  ): Promise<CheckoutSessionResult> {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Apenas o titular (ADMIN) da conta familiar pode contratar ou alterar o plano.',
      );
    }

    if (!dto.acceptedTerms) {
      throw new BadRequestException(
        'Para prosseguir, confirme que leu e concorda com os Termos de Uso e a Política de Cancelamento e Reembolso.',
      );
    }

    if (!this.isPaymentsEnabledForEmail(user.email)) {
      throw new ServiceUnavailableException(
        'O checkout online está temporariamente em manutenção. Tente novamente em instantes.',
      );
    }

    const accessToken = this.getAccessTokenOrThrow();
    await this.ensureTableExists();
    await this.enforceCheckoutRateLimit(familyAccountId, dto.paymentMode);

    const dbUser = await this.prisma.user.findFirst({
      where: { id: user.userId, familyAccountId },
      select: { id: true, name: true, email: true },
    });

    if (!dbUser) {
      throw new NotFoundException('Usuário não encontrado na conta familiar.');
    }

    const family = await (
      this.prisma.familyAccount?.findUnique?.({
        where: { id: familyAccountId },
        select: { ownerCpf: true },
      }) ?? Promise.resolve(null)
    ).catch(() => null);

    const amountCents = PLAN_PRICES_CENTS[dto.billingCycle];
    const amountReais = Number((amountCents / 100).toFixed(2));
    const txId = randomUUID();
    const frontendUrl = this.resolveFrontendUrl();
    const backendUrl = this.resolveBackendUrl();

    const cycleLabel =
      dto.billingCycle === BillingCycle.MONTHLY
        ? 'Mensal (30 dias)'
        : dto.billingCycle === BillingCycle.SEMIANNUAL
          ? 'Semestral (6 meses)'
          : 'Anual (12 meses)';

    const maxInstallments =
      dto.billingCycle === BillingCycle.ANNUAL
        ? 12
        : dto.billingCycle === BillingCycle.SEMIANNUAL
          ? 6
          : 1;

    await this.insertTransaction({
      id: txId,
      familyAccountId,
      userId: dbUser.id,
      billingCycle: dto.billingCycle,
      paymentMode: dto.paymentMode,
      amountCents,
      status: 'PENDING',
    });

    const cleanCpf = (dto.payerCpf || family?.ownerCpf || '').replace(/\D/g, '');
    const nameParts = dbUser.name.trim().split(/\s+/);
    const firstName = nameParts[0] || 'Cliente';
    const lastName = nameParts.slice(1).join(' ') || 'Aksurim';

    // 1. Checkout Transparente Nativo — PIX_DIRECT (QR Code & Copia e Cola no próprio modal)
    if (dto.paymentMode === 'PIX_DIRECT') {
      const payment = await this.createMpDirectPayment(
        accessToken,
        {
          transaction_amount: amountReais,
          description: `Aksurim Controle Premium — Plano ${cycleLabel}`,
          payment_method_id: 'pix',
          external_reference: txId,
          statement_descriptor: 'AKSURIM',
          notification_url: `${backendUrl}/api/payments/webhook`,
          payer: {
            email: dbUser.email,
            first_name: firstName,
            last_name: lastName,
            ...(cleanCpf.length === 11
              ? { identification: { type: 'CPF', number: cleanCpf } }
              : {}),
          },
        },
        txId,
      );

      const qrCode =
        payment.point_of_interaction?.transaction_data?.qr_code ?? null;
      const qrCodeBase64 =
        payment.point_of_interaction?.transaction_data?.qr_code_base64 ?? null;

      await this.updateTransactionStatus(txId, 'PENDING', String(payment.id));

      return {
        transactionId: txId,
        checkoutUrl: '',
        billingCycle: dto.billingCycle,
        paymentMode: dto.paymentMode,
        amountCents,
        status: 'PENDING',
        pixQrCode: qrCode,
        pixQrCodeBase64: qrCodeBase64,
      };
    }

    // 2. Checkout Transparente Nativo — CARD_DIRECT (Token PCI-DSS processado direto no modal)
    if (dto.paymentMode === 'CARD_DIRECT') {
      if (!dto.cardToken || !dto.cardToken.trim()) {
        throw new BadRequestException(
          'Token de segurança do cartão não informado. Verifique os dados do cartão e tente novamente.',
        );
      }
      if (cleanCpf.length !== 11) {
        throw new BadRequestException(
          'Informe um CPF válido (11 dígitos) do titular do cartão.',
        );
      }

      const installments = Math.min(
        Math.max(1, Number(dto.installments ?? 1)),
        maxInstallments,
      );

      const payment = await this.createMpDirectPayment(
        accessToken,
        {
          transaction_amount: amountReais,
          token: dto.cardToken.trim(),
          description: `Aksurim Controle Premium — Plano ${cycleLabel}`,
          installments,
          ...(dto.paymentMethodId
            ? { payment_method_id: dto.paymentMethodId.trim() }
            : {}),
          ...(dto.issuerId ? { issuer_id: dto.issuerId.trim() } : {}),
          external_reference: txId,
          statement_descriptor: 'AKSURIM',
          binary_mode: true,
          notification_url: `${backendUrl}/api/payments/webhook`,
          payer: {
            email: dbUser.email,
            first_name: firstName,
            last_name: lastName,
            identification: {
              type: 'CPF',
              number: cleanCpf,
            },
          },
        },
        txId,
      );

      const paidCents = Math.round(
        Number(payment.transaction_amount ?? amountReais) * 100,
      );

      if (payment.status === 'approved' && paidCents >= amountCents) {
        await this.markTransactionApproved(txId, String(payment.id));
        const plan = await this.planService.grantPremium(
          familyAccountId,
          dto.billingCycle,
        );

        void this.sendActivationEmail(
          dbUser.email,
          dbUser.name,
          plan.familyName ?? 'sua família',
          dto.billingCycle,
          amountCents,
        );

        void this.notifyTelegram(
          `👑 <b>Novo pagamento Premium aprovado (Cartão Transparente)!</b>\n` +
            `<b>Família:</b> ${plan.familyName ?? familyAccountId}\n` +
            `<b>Ciclo:</b> ${dto.billingCycle} (${installments}x)\n` +
            `<b>Valor:</b> R$ ${(amountCents / 100).toFixed(2).replace('.', ',')}`,
        );

        return {
          transactionId: txId,
          checkoutUrl: '',
          billingCycle: dto.billingCycle,
          paymentMode: dto.paymentMode,
          amountCents,
          status: 'APPROVED',
          plan,
        };
      }

      if (payment.status === 'rejected' || payment.status === 'cancelled') {
        await this.updateTransactionStatus(txId, 'REJECTED', String(payment.id));
        throw new BadRequestException(
          this.mapCardRejectionMessage(payment.status_detail),
        );
      }

      await this.updateTransactionStatus(txId, 'PENDING', String(payment.id));
      return {
        transactionId: txId,
        checkoutUrl: '',
        billingCycle: dto.billingCycle,
        paymentMode: dto.paymentMode,
        amountCents,
        status: 'PENDING',
      };
    }

    // Legado: Preapproval ou Checkout Pro
    if (
      dto.billingCycle === BillingCycle.MONTHLY &&
      dto.paymentMode === 'CARD_RECURRING'
    ) {
      try {
        const preapproval = await this.createMpPreapproval(accessToken, {
          reason: 'Aksurim Controle Premium — Assinatura Mensal',
          external_reference: txId,
          payer_email: dbUser.email,
          auto_recurring: {
            frequency: 1,
            frequency_type: 'months',
            transaction_amount: amountReais,
            currency_id: 'BRL',
          },
          back_url: `${frontendUrl}/plans?payment=success&tx=${txId}`,
        });

        if (preapproval.init_point) {
          await this.updateTransactionMpIds(txId, {
            mpPreapprovalId: preapproval.id,
            checkoutUrl: preapproval.init_point,
          });

          return {
            transactionId: txId,
            checkoutUrl: preapproval.init_point,
            billingCycle: dto.billingCycle,
            paymentMode: dto.paymentMode,
            amountCents,
          };
        }
      } catch (err) {
        this.logger.warn(
          `Preapproval direto indisponível (${
            err instanceof Error ? err.message : String(err)
          }); utilizando Checkout Pro com cartão habilitado.`,
        );
      }
    }

    const excludedPaymentTypes =
      dto.paymentMode === 'PIX_ONCE'
        ? [{ id: 'ticket' }, { id: 'credit_card' }, { id: 'debit_card' }]
        : [{ id: 'ticket' }];

    const preference = await this.createMpPreference(accessToken, {
      items: [
        {
          id: `AKSURIM-${dto.billingCycle}`,
          title: `Aksurim Controle Premium — Plano ${cycleLabel}`,
          description: `Acesso completo ao Aksurim Controle Premium (${cycleLabel})`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: amountReais,
        },
      ],
      payer: {
        name: dbUser.name,
        email: dbUser.email,
      },
      external_reference: txId,
      statement_descriptor: 'AKSURIM',
      notification_url: `${backendUrl}/api/payments/webhook`,
      back_urls: {
        success: `${frontendUrl}/plans?payment=success&tx=${txId}`,
        failure: `${frontendUrl}/plans?payment=failure&tx=${txId}`,
        pending: `${frontendUrl}/plans?payment=pending&tx=${txId}`,
      },
      auto_return: 'approved',
      payment_methods: {
        excluded_payment_types: excludedPaymentTypes,
        installments: maxInstallments,
      },
    });

    await this.updateTransactionMpIds(txId, {
      mpPreferenceId: preference.id,
      checkoutUrl: preference.init_point,
    });

    return {
      transactionId: txId,
      checkoutUrl: preference.init_point,
      billingCycle: dto.billingCycle,
      paymentMode: dto.paymentMode,
      amountCents,
    };
  }

  /**
   * Valida a assinatura HMAC-SHA256 (`x-signature`) enviada pelo Mercado Pago.
   * Formato do manifesto oficial do MP:
   * `id:[data.id_lower];request-id:[x-request-id];ts:[ts];`
   */
  validateWebhookSignature(params: {
    xSignature?: string;
    xRequestId?: string;
    dataId?: string;
    secret?: string;
  }): boolean {
    const secret = (
      params.secret ??
      this.config.get<string>('MP_WEBHOOK_SECRET') ??
      ''
    ).trim();

    if (!secret) {
      return false;
    }

    const { xSignature, xRequestId, dataId } = params;
    if (!xSignature || !dataId) {
      return false;
    }

    const parts = xSignature.split(',');
    let ts = '';
    let v1 = '';

    for (const part of parts) {
      const [key, val] = part.split('=', 2).map((s) => s.trim());
      if (key === 'ts') ts = val ?? '';
      if (key === 'v1') v1 = val ?? '';
    }

    if (!ts || !v1) {
      return false;
    }

    const cleanId = String(dataId).toLowerCase();
    const manifestParts: string[] = [`id:${cleanId};`];
    if (xRequestId) {
      manifestParts.push(`request-id:${xRequestId};`);
    }
    manifestParts.push(`ts:${ts};`);
    const manifest = manifestParts.join('');

    const computedHex = createHmac('sha256', secret)
      .update(manifest)
      .digest('hex');

    try {
      const a = Buffer.from(computedHex, 'hex');
      const b = Buffer.from(v1, 'hex');
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  /**
   * Processa notificações de Webhook do Mercado Pago de forma idempotente.
   */
  async handleWebhook(params: {
    xSignature?: string;
    xRequestId?: string;
    query: Record<string, string | undefined>;
    body: Record<string, unknown>;
  }): Promise<{ received: boolean; processed: boolean; idempotent?: boolean }> {
    await this.ensureTableExists();

    const bodyData =
      params.body && typeof params.body.data === 'object' && params.body.data !== null
        ? (params.body.data as Record<string, unknown>)
        : undefined;

    const dataId =
      params.query['data.id'] ??
      params.query['data_id'] ??
      params.query['id'] ??
      (bodyData?.id !== undefined ? String(bodyData.id) : undefined);

    const topic =
      params.query['type'] ??
      params.query['topic'] ??
      (typeof params.body.type === 'string' ? params.body.type : undefined) ??
      (typeof params.body.topic === 'string' ? params.body.topic : undefined) ??
      '';

    const secret = (this.config.get<string>('MP_WEBHOOK_SECRET') ?? '').trim();
    if (secret && params.xSignature) {
      const isValid = this.validateWebhookSignature({
        xSignature: params.xSignature,
        xRequestId: params.xRequestId,
        dataId,
        secret,
      });

      if (!isValid) {
        this.logger.warn(
          `Webhook Mercado Pago rejeitado: assinatura x-signature inválida (dataId=${dataId}).`,
        );
        throw new UnauthorizedException('Assinatura de webhook inválida.');
      }
    }

    if (!dataId) {
      return { received: true, processed: false };
    }

    const accessToken = (this.config.get<string>('MP_ACCESS_TOKEN') ?? '').trim();
    if (!accessToken) {
      return { received: true, processed: false };
    }

    if (topic.includes('preapproval')) {
      return this.processPreapprovalNotification(accessToken, dataId);
    }

    if (topic.includes('payment') || topic === '') {
      return this.processPaymentNotification(accessToken, dataId);
    }

    return { received: true, processed: false };
  }

  /**
   * Sincroniza ativamente o status de uma transação ao retornar do checkout
   * (`GET /api/v1/plan/transactions/:id/sync`), garantindo ativação imediata
   * mesmo em ambiente local sem túnel de webhook.
   */
  async verifyAndSyncTransaction(
    familyAccountId: string,
    txId: string,
  ): Promise<{ status: SubscriptionTxStatus; plan: PlanInfo }> {
    await this.ensureTableExists();
    const tx = await this.findTransactionById(txId);
    if (!tx || tx.familyAccountId !== familyAccountId) {
      throw new NotFoundException('Transação não encontrada.');
    }

    if (tx.status === 'APPROVED') {
      return {
        status: tx.status,
        plan: await this.planService.getPlanInfo(familyAccountId),
      };
    }

    const accessToken = (this.config.get<string>('MP_ACCESS_TOKEN') ?? '').trim();
    if (accessToken) {
      if (tx.mpPaymentId) {
        await this.processPaymentNotification(accessToken, tx.mpPaymentId);
      } else if (tx.mpPreapprovalId) {
        await this.processPreapprovalNotification(accessToken, tx.mpPreapprovalId);
      } else {
        const payments = await this.searchMpPaymentsByExternalRef(
          accessToken,
          tx.id,
        );
        const approved = payments.find((p) => p.status === 'approved');
        if (approved) {
          await this.processPaymentNotification(accessToken, String(approved.id));
        }
      }
    }

    const updatedTx = await this.findTransactionById(txId);
    return {
      status: updatedTx?.status ?? tx.status,
      plan: await this.planService.getPlanInfo(familyAccountId),
    };
  }

  /**
   * Cancelamento em 1 clique da renovação automática no cartão (sem multa).
   * O cliente mantém o acesso Premium até o fim do período já pago.
   */
  async cancelRecurringSubscription(
    familyAccountId: string,
    user: AuthenticatedUser,
  ): Promise<{ cancelled: boolean; message: string; plan: PlanInfo }> {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Apenas o titular (ADMIN) da conta familiar pode cancelar a renovação automática.',
      );
    }

    await this.ensureTableExists();
    const txs = await this.findTransactionsByFamily(familyAccountId);
    const activeTx = txs.find(
      (t) =>
        t.paymentMode === 'CARD_RECURRING' &&
        Boolean(t.mpPreapprovalId) &&
        (t.status === 'APPROVED' || t.status === 'AUTHORIZED'),
    );

    if (!activeTx || !activeTx.mpPreapprovalId) {
      throw new BadRequestException(
        'Não há assinatura com renovação automática ativa nesta conta.',
      );
    }

    const accessToken = this.getAccessTokenOrThrow();
    await this.cancelMpPreapproval(accessToken, activeTx.mpPreapprovalId);
    await this.updateTransactionStatus(activeTx.id, 'CANCELLED');

    const plan = await this.planService.getPlanInfo(familyAccountId);
    void this.notifyTelegram(
      `🔄 <b>Renovação automática cancelada pelo cliente</b>\n` +
        `<b>Família:</b> ${plan.familyName ?? familyAccountId}\n` +
        `<b>E-mail:</b> ${user.email}\n` +
        `<b>Acesso mantido até:</b> ${plan.premiumEndsAt ?? '-'}`,
    );

    return {
      cancelled: true,
      message:
        'Renovação automática cancelada com sucesso! Nenhuma nova cobrança será feita e seu acesso Premium continua ativo até o final do período já pago.',
      plan,
    };
  }

  /**
   * Reembolso integral automático dentro de 7 dias corridos da 1ª contratação
   * (Direito de Arrependimento — Art. 49 do CDC).
   */
  async requestCdcRefund(
    familyAccountId: string,
    user: AuthenticatedUser,
  ): Promise<{ refunded: boolean; message: string; plan: PlanInfo }> {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Apenas o titular (ADMIN) da conta familiar pode solicitar o reembolso.',
      );
    }

    await this.ensureTableExists();
    const summary = await this.getFamilySubscriptionSummary(
      familyAccountId,
      user.email,
    );

    if (!summary.canRequestCdcRefund || !summary.refundableTransactionId) {
      throw new BadRequestException(
        'O prazo legal de 7 dias corridos da primeira contratação para reembolso automático já se encerrou ou não há pagamento elegível. Caso precise de ajuda, contate nosso suporte.',
      );
    }

    const tx = await this.findTransactionById(summary.refundableTransactionId);
    if (!tx) {
      throw new NotFoundException('Transação não encontrada para reembolso.');
    }

    const accessToken = this.getAccessTokenOrThrow();

    if (tx.mpPaymentId) {
      await this.refundMpPayment(accessToken, tx.mpPaymentId);
    }

    if (tx.mpPreapprovalId) {
      await this.cancelMpPreapproval(accessToken, tx.mpPreapprovalId).catch(
        () => undefined,
      );
    }

    await this.markTransactionRefunded(tx.id, tx.amountCents);
    const plan = await this.planService.revokePremium(familyAccountId);

    void this.sendRefundConfirmationEmail(
      user.email,
      plan.familyName ?? 'sua família',
      tx.amountCents,
    );

    void this.notifyTelegram(
      `💸 <b>Reembolso Automático CDC (7 dias) realizado</b>\n` +
        `<b>Família:</b> ${plan.familyName ?? familyAccountId}\n` +
        `<b>E-mail:</b> ${user.email}\n` +
        `<b>Valor estornado:</b> R$ ${(tx.amountCents / 100).toFixed(2).replace('.', ',')}`,
    );

    return {
      refunded: true,
      message:
        'Reembolso integral solicitado com sucesso junto ao Mercado Pago! O valor será devolvido ao mesmo meio de pagamento utilizado.',
      plan,
    };
  }

  /**
   * Lista todas as transações de assinatura para o Painel Admin Global (`/admin`).
   * Antes de retornar, reconcilia automaticamente transações PENDING recentes no Mercado Pago.
   */
  async adminListTransactions(): Promise<AdminTransactionView[]> {
    await this.ensureTableExists();
    const pendingRows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        status: SubscriptionTxStatus;
        mpPaymentId: string | null;
        mpPreapprovalId: string | null;
      }>
    >`
      SELECT id, status, mpPaymentId, mpPreapprovalId
      FROM subscription_transactions
      WHERE status = 'PENDING'
      ORDER BY createdAt DESC
      LIMIT 10
    `;
    await this.reconcilePendingTransactions(pendingRows);

    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        familyAccountId: string;
        userId: string;
        billingCycle: BillingCycle;
        paymentMode: CheckoutPaymentMode;
        amountCents: number;
        status: SubscriptionTxStatus;
        mpPaymentId: string | null;
        mpPreapprovalId: string | null;
        mpPreferenceId: string | null;
        checkoutUrl: string | null;
        refundedAmountCents: number | null;
        refundedAt: Date | null;
        approvedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        familyName: string;
        userEmail: string;
        userName: string;
      }>
    >`
      SELECT
        st.id,
        st.familyAccountId,
        st.userId,
        st.billingCycle,
        st.paymentMode,
        st.amountCents,
        st.status,
        st.mpPaymentId,
        st.mpPreapprovalId,
        st.mpPreferenceId,
        st.checkoutUrl,
        st.refundedAmountCents,
        st.refundedAt,
        st.approvedAt,
        st.createdAt,
        st.updatedAt,
        fa.name AS familyName,
        u.email AS userEmail,
        u.name AS userName
      FROM subscription_transactions st
      INNER JOIN family_accounts fa ON fa.id = st.familyAccountId
      INNER JOIN users u ON u.id = st.userId
      ORDER BY st.createdAt DESC
      LIMIT 200
    `;

    return rows.map((r) => ({
      ...r,
      amountCents: Number(r.amountCents),
      refundedAmountCents:
        r.refundedAmountCents !== null ? Number(r.refundedAmountCents) : null,
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
      approvedAt: r.approvedAt ? new Date(r.approvedAt) : null,
      refundedAt: r.refundedAt ? new Date(r.refundedAt) : null,
    }));
  }

  /**
   * Remove transações PENDING abandonadas (após reconciliar com o Mercado Pago para garantir
   * que nenhum pagamento aprovado seja removido).
   */
  async adminClearPendingTransactions(): Promise<{ deletedCount: number }> {
    await this.ensureTableExists();
    const pendingRows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        status: SubscriptionTxStatus;
        mpPaymentId: string | null;
        mpPreapprovalId: string | null;
      }>
    >`
      SELECT id, status, mpPaymentId, mpPreapprovalId
      FROM subscription_transactions
      WHERE status = 'PENDING'
      ORDER BY createdAt DESC
      LIMIT 20
    `;
    await this.reconcilePendingTransactions(pendingRows);

    const deletedCount = await this.prisma.$executeRaw`
      DELETE FROM subscription_transactions
      WHERE status IN ('PENDING', 'REJECTED', 'CANCELLED')
    `;

    return { deletedCount: Number(deletedCount) };
  }

  /**
   * Estorno Total ou Parcial disparado pelo Admin Global no `/admin`.
   */
  async adminRefundTransaction(
    txId: string,
    dto: AdminRefundDto,
  ): Promise<{ refunded: boolean; refundedAmountCents: number; plan: PlanInfo }> {
    await this.ensureTableExists();
    const tx = await this.findTransactionById(txId);
    if (!tx) {
      throw new NotFoundException('Transação não encontrada.');
    }

    if (tx.status === 'REFUNDED') {
      throw new BadRequestException('Esta transação já foi estornada.');
    }

    const refundAmountCents = dto.amountCents ?? tx.amountCents;
    if (refundAmountCents > tx.amountCents) {
      throw new BadRequestException(
        'O valor do estorno não pode ser maior que o valor pago na transação.',
      );
    }

    const accessToken = this.getAccessTokenOrThrow();

    if (tx.mpPaymentId) {
      const isPartial = refundAmountCents < tx.amountCents;
      await this.refundMpPayment(
        accessToken,
        tx.mpPaymentId,
        isPartial ? Number((refundAmountCents / 100).toFixed(2)) : undefined,
      );
    }

    if (tx.mpPreapprovalId) {
      await this.cancelMpPreapproval(accessToken, tx.mpPreapprovalId).catch(
        () => undefined,
      );
    }

    await this.markTransactionRefunded(tx.id, refundAmountCents);
    const plan = await this.planService.revokePremium(tx.familyAccountId);

    const owner = await this.prisma.user.findFirst({
      where: { familyAccountId: tx.familyAccountId, role: Role.ADMIN },
      select: { email: true },
    });

    if (owner?.email) {
      void this.sendRefundConfirmationEmail(
        owner.email,
        plan.familyName ?? 'sua família',
        refundAmountCents,
      );
    }

    return {
      refunded: true,
      refundedAmountCents: refundAmountCents,
      plan,
    };
  }

  // ─── Processadores internos de Webhook e Reconciliação Ativa ────────

  /**
   * Consulta o Mercado Pago para transações recentes com status PENDING
   * (útil quando o cliente fecha a aba antes do redirect ou em ambiente local sem webhook público).
   */
  private async reconcilePendingTransactions(
    txs: Array<{
      id: string;
      status: SubscriptionTxStatus;
      mpPaymentId?: string | null;
      mpPreapprovalId: string | null;
    }>,
  ): Promise<boolean> {
    const accessToken = (this.config.get<string>('MP_ACCESS_TOKEN') ?? '').trim();
    if (!accessToken) return false;

    const pending = txs.filter((t) => t.status === 'PENDING').slice(0, 10);
    if (pending.length === 0) return false;

    let anyUpdated = false;
    for (const tx of pending) {
      try {
        if (tx.mpPaymentId) {
          const res = await this.processPaymentNotification(
            accessToken,
            tx.mpPaymentId,
          );
          if (res.processed) anyUpdated = true;
        } else if (tx.mpPreapprovalId) {
          const res = await this.processPreapprovalNotification(
            accessToken,
            tx.mpPreapprovalId,
          );
          if (res.processed) anyUpdated = true;
        } else {
          const payments = await this.searchMpPaymentsByExternalRef(
            accessToken,
            tx.id,
          );
          const approved = payments.find((p) => p.status === 'approved');
          if (approved) {
            await this.processPaymentNotification(
              accessToken,
              String(approved.id),
            );
            anyUpdated = true;
          } else {
            const rejected = payments.find(
              (p) => p.status === 'rejected' || p.status === 'cancelled',
            );
            if (rejected) {
              await this.updateTransactionStatus(
                tx.id,
                'REJECTED',
                String(rejected.id),
              );
              anyUpdated = true;
            }
          }
        }
      } catch {
        // Ignora falhas de rede individuais na reconciliação silenciosa
      }
    }

    return anyUpdated;
  }

  private async processPaymentNotification(
    accessToken: string,
    mpPaymentId: string,
  ): Promise<{ received: boolean; processed: boolean; idempotent?: boolean }> {
    const payment = await this.fetchMpPayment(accessToken, mpPaymentId);
    if (!payment || !payment.external_reference) {
      return { received: true, processed: false };
    }

    const tx = await this.findTransactionById(payment.external_reference);
    if (!tx) {
      return { received: true, processed: false };
    }

    // Idempotência: se já aprovada com este mesmo pagamento, não duplica meses
    if (tx.status === 'APPROVED' && tx.mpPaymentId === String(payment.id)) {
      return { received: true, processed: true, idempotent: true };
    }

    if (payment.status === 'approved') {
      // Blindagem de segurança: valida se o valor pago no gateway corresponde ao valor oficial da transação
      if (payment.transaction_amount !== undefined) {
        const paidCents = Math.round(Number(payment.transaction_amount) * 100);
        if (paidCents < tx.amountCents) {
          this.logger.error(
            `ALERTA DE SEGURANÇA: Pagamento ${payment.id} para tx ${tx.id} teve valor divergente (${paidCents} < ${tx.amountCents}). Bloqueado.`,
          );
          return { received: true, processed: false };
        }
      }

      await this.markTransactionApproved(tx.id, String(payment.id));
      const plan = await this.planService.grantPremium(
        tx.familyAccountId,
        tx.billingCycle,
      );

      const owner = await this.prisma.user.findFirst({
        where: { id: tx.userId },
        select: { name: true, email: true },
      });

      if (owner) {
        void this.sendActivationEmail(
          owner.email,
          owner.name,
          plan.familyName ?? 'sua família',
          tx.billingCycle,
          tx.amountCents,
        );
      }

      void this.notifyTelegram(
        `👑 <b>Novo pagamento Premium aprovado!</b>\n` +
          `<b>Família:</b> ${plan.familyName ?? tx.familyAccountId}\n` +
          `<b>Ciclo:</b> ${tx.billingCycle} (${tx.paymentMode})\n` +
          `<b>Valor:</b> R$ ${(tx.amountCents / 100).toFixed(2).replace('.', ',')}`,
      );

      return { received: true, processed: true };
    }

    if (payment.status === 'rejected' || payment.status === 'cancelled') {
      await this.updateTransactionStatus(tx.id, 'REJECTED', String(payment.id));
      return { received: true, processed: true };
    }

    if (payment.status === 'refunded' || payment.status === 'charged_back') {
      await this.markTransactionRefunded(tx.id, tx.amountCents);
      await this.planService.revokePremium(tx.familyAccountId);
      return { received: true, processed: true };
    }

    return { received: true, processed: false };
  }

  private async processPreapprovalNotification(
    accessToken: string,
    preapprovalId: string,
  ): Promise<{ received: boolean; processed: boolean; idempotent?: boolean }> {
    const preapproval = await this.fetchMpPreapproval(accessToken, preapprovalId);
    if (!preapproval || !preapproval.external_reference) {
      return { received: true, processed: false };
    }

    const tx = await this.findTransactionById(preapproval.external_reference);
    if (!tx) {
      return { received: true, processed: false };
    }

    if (preapproval.status === 'authorized') {
      if (tx.status === 'APPROVED') {
        return { received: true, processed: true, idempotent: true };
      }
      await this.markTransactionApproved(tx.id, tx.mpPaymentId, preapprovalId);
      await this.planService.grantPremium(tx.familyAccountId, tx.billingCycle);
      return { received: true, processed: true };
    }

    if (preapproval.status === 'cancelled' || preapproval.status === 'paused') {
      await this.updateTransactionStatus(tx.id, 'CANCELLED');
      return { received: true, processed: true };
    }

    return { received: true, processed: false };
  }

  // ─── Blindagem Anti-Fraude e Chamadas HTTP Mercado Pago ─────────────

  /**
   * Proteção contra ataques de força bruta / testagem de cartões (Carding):
   * Limita tentativas de checkout por família nos últimos 10 minutos.
   */
  private async enforceCheckoutRateLimit(
    familyAccountId: string,
    paymentMode: CheckoutPaymentMode,
  ): Promise<void> {
    try {
      const txs = await this.findTransactionsByFamily(familyAccountId);
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
      const recentAttempts = txs.filter(
        (t) => t.createdAt.getTime() >= tenMinutesAgo,
      );
      const maxAllowed = paymentMode === 'CARD_DIRECT' ? 5 : 10;
      if (recentAttempts.length >= maxAllowed) {
        throw new BadRequestException(
          'Muitas tentativas de pagamento em sequência. Por segurança, aguarde alguns minutos antes de tentar novamente.',
        );
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
    }
  }

  private mapCardRejectionMessage(statusDetail?: string): string {
    switch (statusDetail) {
      case 'cc_rejected_insufficient_amount':
        return 'Pagamento recusado pelo banco emissor: limite insuficiente no cartão.';
      case 'cc_rejected_bad_filled_security_code':
        return 'Código de segurança (CVV) inválido. Verifique os 3 ou 4 dígitos no verso do cartão.';
      case 'cc_rejected_bad_filled_date':
        return 'Data de validade do cartão inválida ou cartão vencido.';
      case 'cc_rejected_bad_filled_card_number':
        return 'Número do cartão inválido. Revise os dígitos informados.';
      case 'cc_rejected_call_for_authorize':
        return 'O banco emissor solicitou autorização prévia para esta compra. Autorize no app do seu banco ou utilize o Pix.';
      case 'cc_rejected_high_risk':
      case 'cc_rejected_blacklist':
        return 'Transação recusada por segurança pelo emissor. Tente outro cartão ou pague via Pix com liberação imediata.';
      default:
        return 'Pagamento não autorizado pela operadora do cartão. Verifique os dados ou utilize o Pix.';
    }
  }

  private async createMpDirectPayment(
    accessToken: string,
    payload: Record<string, unknown>,
    idempotencyKey: string,
  ): Promise<MpPaymentResponse> {
    const res = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const detail = await res.text();
      this.logger.error(
        `Erro ao processar pagamento transparente MP (${res.status}): ${detail}`,
      );
      throw new BadGatewayException(
        'Não foi possível processar o pagamento junto ao Mercado Pago. Verifique os dados informados ou tente via Pix.',
      );
    }

    return (await res.json()) as MpPaymentResponse;
  }

  private async createMpPreference(
    accessToken: string,
    payload: Record<string, unknown>,
  ): Promise<MpPreferenceResponse> {
    const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': randomUUID(),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const detail = await res.text();
      this.logger.error(`Erro ao criar preferência MP (${res.status}): ${detail}`);
      throw new BadGatewayException(
        'Não foi possível iniciar o checkout no Mercado Pago. Verifique os dados e tente novamente.',
      );
    }

    return (await res.json()) as MpPreferenceResponse;
  }

  private async createMpPreapproval(
    accessToken: string,
    payload: Record<string, unknown>,
  ): Promise<MpPreapprovalResponse> {
    const res = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': randomUUID(),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new BadGatewayException(`Preapproval falhou (${res.status}): ${detail}`);
    }

    return (await res.json()) as MpPreapprovalResponse;
  }

  private async fetchMpPayment(
    accessToken: string,
    paymentId: string,
  ): Promise<MpPaymentResponse | null> {
    const res = await fetch(
      `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    if (!res.ok) return null;
    return (await res.json()) as MpPaymentResponse;
  }

  private async searchMpPaymentsByExternalRef(
    accessToken: string,
    externalRef: string,
  ): Promise<Array<{ id: number | string; status: string }>> {
    const res = await fetch(
      `https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(
        externalRef,
      )}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as MpSearchPaymentsResponse;
    return data.results ?? [];
  }

  private async fetchMpPreapproval(
    accessToken: string,
    preapprovalId: string,
  ): Promise<MpPreapprovalResponse | null> {
    const res = await fetch(
      `https://api.mercadopago.com/preapproval/${encodeURIComponent(preapprovalId)}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    if (!res.ok) return null;
    return (await res.json()) as MpPreapprovalResponse;
  }

  private async cancelMpPreapproval(
    accessToken: string,
    preapprovalId: string,
  ): Promise<void> {
    const res = await fetch(
      `https://api.mercadopago.com/preapproval/${encodeURIComponent(preapprovalId)}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'cancelled' }),
      },
    );

    if (!res.ok) {
      const detail = await res.text();
      this.logger.error(
        `Falha ao cancelar assinatura no Mercado Pago (${res.status}): ${detail}`,
      );
      throw new BadGatewayException(
        'Não foi possível cancelar a assinatura junto ao Mercado Pago.',
      );
    }
  }

  private async refundMpPayment(
    accessToken: string,
    mpPaymentId: string,
    partialAmountReais?: number,
  ): Promise<void> {
    const body =
      partialAmountReais !== undefined ? { amount: partialAmountReais } : {};
    const res = await fetch(
      `https://api.mercadopago.com/v1/payments/${encodeURIComponent(
        mpPaymentId,
      )}/refunds`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': randomUUID(),
        },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const detail = await res.text();
      this.logger.error(
        `Falha ao estornar pagamento ${mpPaymentId} no Mercado Pago (${res.status}): ${detail}`,
      );
      throw new BadGatewayException(
        'Não foi possível processar o estorno automático no Mercado Pago. Contate o suporte.',
      );
    }
  }

  // ─── Persistência SQL Segura (Parametrizada) ─────────────────────────

  private async insertTransaction(input: {
    id: string;
    familyAccountId: string;
    userId: string;
    billingCycle: BillingCycle;
    paymentMode: CheckoutPaymentMode;
    amountCents: number;
    status: SubscriptionTxStatus;
  }): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO subscription_transactions
        (id, familyAccountId, userId, billingCycle, paymentMode, amountCents, status, createdAt, updatedAt)
      VALUES
        (${input.id}, ${input.familyAccountId}, ${input.userId}, ${input.billingCycle}, ${input.paymentMode}, ${input.amountCents}, ${input.status}, NOW(3), NOW(3))
    `;
  }

  private async updateTransactionMpIds(
    id: string,
    fields: {
      mpPreapprovalId?: string;
      mpPreferenceId?: string;
      checkoutUrl?: string;
    },
  ): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE subscription_transactions
      SET
        mpPreapprovalId = COALESCE(${fields.mpPreapprovalId ?? null}, mpPreapprovalId),
        mpPreferenceId = COALESCE(${fields.mpPreferenceId ?? null}, mpPreferenceId),
        checkoutUrl = COALESCE(${fields.checkoutUrl ?? null}, checkoutUrl),
        updatedAt = NOW(3)
      WHERE id = ${id}
    `;
  }

  private async markTransactionApproved(
    id: string,
    mpPaymentId?: string | null,
    mpPreapprovalId?: string | null,
  ): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE subscription_transactions
      SET
        status = 'APPROVED',
        mpPaymentId = COALESCE(${mpPaymentId ?? null}, mpPaymentId),
        mpPreapprovalId = COALESCE(${mpPreapprovalId ?? null}, mpPreapprovalId),
        approvedAt = COALESCE(approvedAt, NOW(3)),
        updatedAt = NOW(3)
      WHERE id = ${id}
    `;
  }

  private async updateTransactionStatus(
    id: string,
    status: SubscriptionTxStatus,
    mpPaymentId?: string | null,
  ): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE subscription_transactions
      SET
        status = ${status},
        mpPaymentId = COALESCE(${mpPaymentId ?? null}, mpPaymentId),
        updatedAt = NOW(3)
      WHERE id = ${id}
    `;
  }

  private async markTransactionRefunded(
    id: string,
    refundedAmountCents: number,
  ): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE subscription_transactions
      SET
        status = 'REFUNDED',
        refundedAmountCents = ${refundedAmountCents},
        refundedAt = NOW(3),
        updatedAt = NOW(3)
      WHERE id = ${id}
    `;
  }

  private async findTransactionById(
    id: string,
  ): Promise<SubscriptionTransactionRecord | null> {
    const rows = await this.prisma.$queryRaw<SubscriptionTransactionRecord[]>`
      SELECT
        id, familyAccountId, userId, billingCycle, paymentMode, amountCents,
        status, mpPaymentId, mpPreapprovalId, mpPreferenceId, checkoutUrl,
        refundedAmountCents, refundedAt, approvedAt, createdAt, updatedAt
      FROM subscription_transactions
      WHERE id = ${id}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return null;
    return this.normalizeRow(row);
  }

  private async findTransactionsByFamily(
    familyAccountId: string,
  ): Promise<SubscriptionTransactionRecord[]> {
    const rows = await this.prisma.$queryRaw<SubscriptionTransactionRecord[]>`
      SELECT
        id, familyAccountId, userId, billingCycle, paymentMode, amountCents,
        status, mpPaymentId, mpPreapprovalId, mpPreferenceId, checkoutUrl,
        refundedAmountCents, refundedAt, approvedAt, createdAt, updatedAt
      FROM subscription_transactions
      WHERE familyAccountId = ${familyAccountId}
      ORDER BY createdAt DESC
      LIMIT 50
    `;
    return rows.map((r) => this.normalizeRow(r));
  }

  private normalizeRow(
    row: SubscriptionTransactionRecord,
  ): SubscriptionTransactionRecord {
    return {
      ...row,
      amountCents: Number(row.amountCents),
      refundedAmountCents:
        row.refundedAmountCents !== null ? Number(row.refundedAmountCents) : null,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      approvedAt: row.approvedAt ? new Date(row.approvedAt) : null,
      refundedAt: row.refundedAt ? new Date(row.refundedAt) : null,
    };
  }

  // ─── Utilitários de ambiente e notificações ──────────────────────────

  private getAccessTokenOrThrow(): string {
    const token = (this.config.get<string>('MP_ACCESS_TOKEN') ?? '').trim();
    if (!token) {
      throw new ServiceUnavailableException(
        'Credenciais do Mercado Pago não configuradas no ambiente.',
      );
    }
    return token;
  }

  private resolveFrontendUrl(): string {
    const configured = (this.config.get<string>('FRONTEND_URL') ?? '').trim();
    if (configured) return configured.replace(/\/$/, '');
    return this.config.get<string>('NODE_ENV') === 'production'
      ? 'https://controle.aksurim.com'
      : 'http://localhost:5173';
  }

  private resolveBackendUrl(): string {
    const configured = (this.config.get<string>('BACKEND_URL') ?? '').trim();
    if (configured) return configured.replace(/\/$/, '');
    return this.config.get<string>('NODE_ENV') === 'production'
      ? 'https://controle.aksurim.com'
      : 'http://localhost:3000';
  }

  private async sendActivationEmail(
    to: string,
    userName: string,
    familyName: string,
    cycle: BillingCycle,
    amountCents: number,
  ): Promise<void> {
    const formattedValue = `R$ ${(amountCents / 100).toFixed(2).replace('.', ',')}`;
    const cycleName =
      cycle === BillingCycle.MONTHLY
        ? 'Mensal'
        : cycle === BillingCycle.SEMIANNUAL
          ? 'Semestral'
          : 'Anual';

    await this.mailerService
      .sendMail({
        to,
        subject: '👑 Assinatura Premium Confirmada — Aksurim Controle',
        html: `
          <p>Olá, <strong>${userName}</strong>!</p>
          <p>Seu pagamento de <strong>${formattedValue}</strong> referente ao plano <strong>👑 Premium (${cycleName})</strong> da conta <strong>${familyName}</strong> foi confirmado com sucesso.</p>
          <p>Todos os recursos exclusivos já estão liberados para você e para os membros do seu grupo.</p>
          <hr />
          <p style="font-size:12px;color:#64748b;">
            Consulte a qualquer momento nossos <a href="https://controle.aksurim.com/termos">Termos de Uso</a>,
            <a href="https://controle.aksurim.com/privacidade">Política de Privacidade</a> e
            <a href="https://controle.aksurim.com/reembolso">Política de Cancelamento e Reembolso</a>.
            Dúvidas: suporte@aksurim.com
          </p>
        `,
      })
      .catch((err) =>
        this.logger.warn(`Falha ao enviar e-mail de ativação para ${to}: ${err}`),
      );
  }

  private async sendRefundConfirmationEmail(
    to: string,
    familyName: string,
    amountCents: number,
  ): Promise<void> {
    const formattedValue = `R$ ${(amountCents / 100).toFixed(2).replace('.', ',')}`;
    await this.mailerService
      .sendMail({
        to,
        subject: 'Comprovante de Reembolso — Aksurim Controle',
        html: `
          <p>Olá!</p>
          <p>Confirmamos o processamento do reembolso no valor de <strong>${formattedValue}</strong> referente à conta <strong>${familyName}</strong> junto ao Mercado Pago.</p>
          <p>Seus dados e histórico financeiro permanecem salvos gratuitamente no Plano Gratuito.</p>
          <p style="font-size:12px;color:#64748b;">Atendimento: suporte@aksurim.com</p>
        `,
      })
      .catch((err) =>
        this.logger.warn(`Falha ao enviar e-mail de reembolso para ${to}: ${err}`),
      );
  }

  private async notifyTelegram(htmlText: string): Promise<void> {
    const botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    const chatId = this.config.get<string>('TELEGRAM_CHAT_ID');
    if (!botToken || !chatId) return;

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: htmlText,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    }).catch(() => undefined);
  }
}
