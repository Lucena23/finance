"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PlanPaymentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanPaymentService = void 0;
const node_crypto_1 = require("node:crypto");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mailer_1 = require("@nestjs-modules/mailer");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const plan_constants_1 = require("./plan.constants");
const plan_service_1 = require("./plan.service");
let PlanPaymentService = PlanPaymentService_1 = class PlanPaymentService {
    constructor(prisma, config, planService, mailerService) {
        this.prisma = prisma;
        this.config = config;
        this.planService = planService;
        this.mailerService = mailerService;
        this.logger = new common_1.Logger(PlanPaymentService_1.name);
        this.tableEnsured = false;
    }
    async onModuleInit() {
        await this.ensureTableExists();
    }
    async ensureTableExists() {
        if (this.tableEnsured)
            return;
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
        }
        catch (err) {
            this.logger.warn(`Aviso ao verificar tabela subscription_transactions: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    isPaymentsEnabledForEmail(email) {
        const rawEnabled = (this.config.get('PAYMENTS_ENABLED') ?? '')
            .trim()
            .toLowerCase();
        if (rawEnabled === 'true' || rawEnabled === '1') {
            return true;
        }
        if (!email)
            return false;
        const allowlistRaw = this.config.get('PAYMENTS_ALLOWLIST_EMAILS') ?? '';
        const allowlist = allowlistRaw
            .split(',')
            .map((item) => item.trim().toLowerCase())
            .filter(Boolean);
        return allowlist.includes(email.trim().toLowerCase());
    }
    getPricingCatalog() {
        return [
            {
                id: client_1.BillingCycle.MONTHLY,
                name: 'Mensal',
                amountCents: plan_constants_1.PLAN_PRICES_CENTS.MONTHLY,
                equivalentMonthlyCents: plan_constants_1.PLAN_EQUIVALENT_MONTHLY_CENTS.MONTHLY,
                discountPercent: 0,
                popular: false,
            },
            {
                id: client_1.BillingCycle.SEMIANNUAL,
                name: 'Semestral',
                amountCents: plan_constants_1.PLAN_PRICES_CENTS.SEMIANNUAL,
                equivalentMonthlyCents: plan_constants_1.PLAN_EQUIVALENT_MONTHLY_CENTS.SEMIANNUAL,
                discountPercent: 19,
                popular: false,
            },
            {
                id: client_1.BillingCycle.ANNUAL,
                name: 'Anual',
                amountCents: plan_constants_1.PLAN_PRICES_CENTS.ANNUAL,
                equivalentMonthlyCents: plan_constants_1.PLAN_EQUIVALENT_MONTHLY_CENTS.ANNUAL,
                discountPercent: 42,
                popular: true,
            },
        ];
    }
    async reconcileFamilyPending(familyAccountId) {
        try {
            await this.ensureTableExists();
            const txs = await this.findTransactionsByFamily(familyAccountId);
            await this.reconcilePendingTransactions(txs);
        }
        catch {
        }
    }
    async getFamilySubscriptionSummary(familyAccountId, userEmail) {
        await this.ensureTableExists();
        let txs = await this.findTransactionsByFamily(familyAccountId);
        const reconciled = await this.reconcilePendingTransactions(txs);
        if (reconciled) {
            txs = await this.findTransactionsByFamily(familyAccountId);
        }
        const activeRecurringTx = txs.find((t) => t.paymentMode === 'CARD_RECURRING' &&
            Boolean(t.mpPreapprovalId) &&
            (t.status === 'APPROVED' || t.status === 'AUTHORIZED'));
        const approvedTxs = txs
            .filter((t) => t.status === 'APPROVED' || t.status === 'REFUNDED')
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        const firstApproved = approvedTxs[0];
        let canRequestCdcRefund = false;
        let cdcRefundDeadline = null;
        let refundableTransactionId = null;
        let refundableAmountCents = null;
        if (firstApproved &&
            firstApproved.status === 'APPROVED' &&
            firstApproved.approvedAt &&
            !firstApproved.refundedAt) {
            const deadlineMs = firstApproved.approvedAt.getTime() + plan_constants_1.CDC_REFUND_WINDOW_DAYS * plan_constants_1.DAY_MS;
            if (Date.now() <= deadlineMs) {
                canRequestCdcRefund = true;
                cdcRefundDeadline = new Date(deadlineMs).toISOString();
                refundableTransactionId = firstApproved.id;
                refundableAmountCents = firstApproved.amountCents;
            }
        }
        return {
            paymentsEnabled: this.isPaymentsEnabledForEmail(userEmail),
            termsVersion: plan_constants_1.TERMS_CURRENT_VERSION,
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
    async createCheckout(familyAccountId, user, dto) {
        if (user.role !== client_1.Role.ADMIN) {
            throw new common_1.ForbiddenException('Apenas o titular (ADMIN) da conta familiar pode contratar ou alterar o plano.');
        }
        if (!dto.acceptedTerms) {
            throw new common_1.BadRequestException('Para prosseguir, confirme que leu e concorda com os Termos de Uso e a Política de Cancelamento e Reembolso.');
        }
        if (!this.isPaymentsEnabledForEmail(user.email)) {
            throw new common_1.ServiceUnavailableException('O checkout online está temporariamente em manutenção. Tente novamente em instantes.');
        }
        const accessToken = this.getAccessTokenOrThrow();
        await this.ensureTableExists();
        const dbUser = await this.prisma.user.findFirst({
            where: { id: user.userId, familyAccountId },
            select: { id: true, name: true, email: true },
        });
        if (!dbUser) {
            throw new common_1.NotFoundException('Usuário não encontrado na conta familiar.');
        }
        const amountCents = plan_constants_1.PLAN_PRICES_CENTS[dto.billingCycle];
        const amountReais = Number((amountCents / 100).toFixed(2));
        const txId = (0, node_crypto_1.randomUUID)();
        const frontendUrl = this.resolveFrontendUrl();
        const backendUrl = this.resolveBackendUrl();
        await this.insertTransaction({
            id: txId,
            familyAccountId,
            userId: dbUser.id,
            billingCycle: dto.billingCycle,
            paymentMode: dto.paymentMode,
            amountCents,
            status: 'PENDING',
        });
        if (dto.billingCycle === client_1.BillingCycle.MONTHLY &&
            dto.paymentMode === 'CARD_RECURRING') {
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
            }
            catch (err) {
                this.logger.warn(`Preapproval direto indisponível (${err instanceof Error ? err.message : String(err)}); utilizando Checkout Pro com cartão habilitado.`);
            }
        }
        const cycleLabel = dto.billingCycle === client_1.BillingCycle.MONTHLY
            ? 'Mensal (30 dias)'
            : dto.billingCycle === client_1.BillingCycle.SEMIANNUAL
                ? 'Semestral (6 meses)'
                : 'Anual (12 meses)';
        const excludedPaymentTypes = dto.paymentMode === 'PIX_ONCE'
            ? [{ id: 'ticket' }, { id: 'credit_card' }, { id: 'debit_card' }]
            : [{ id: 'ticket' }];
        const maxInstallments = dto.billingCycle === client_1.BillingCycle.ANNUAL
            ? 12
            : dto.billingCycle === client_1.BillingCycle.SEMIANNUAL
                ? 6
                : 1;
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
    validateWebhookSignature(params) {
        const secret = (params.secret ??
            this.config.get('MP_WEBHOOK_SECRET') ??
            '').trim();
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
            if (key === 'ts')
                ts = val ?? '';
            if (key === 'v1')
                v1 = val ?? '';
        }
        if (!ts || !v1) {
            return false;
        }
        const cleanId = String(dataId).toLowerCase();
        const manifestParts = [`id:${cleanId};`];
        if (xRequestId) {
            manifestParts.push(`request-id:${xRequestId};`);
        }
        manifestParts.push(`ts:${ts};`);
        const manifest = manifestParts.join('');
        const computedHex = (0, node_crypto_1.createHmac)('sha256', secret)
            .update(manifest)
            .digest('hex');
        try {
            const a = Buffer.from(computedHex, 'hex');
            const b = Buffer.from(v1, 'hex');
            if (a.length !== b.length)
                return false;
            return (0, node_crypto_1.timingSafeEqual)(a, b);
        }
        catch {
            return false;
        }
    }
    async handleWebhook(params) {
        await this.ensureTableExists();
        const bodyData = params.body && typeof params.body.data === 'object' && params.body.data !== null
            ? params.body.data
            : undefined;
        const dataId = params.query['data.id'] ??
            params.query['data_id'] ??
            params.query['id'] ??
            (bodyData?.id !== undefined ? String(bodyData.id) : undefined);
        const topic = params.query['type'] ??
            params.query['topic'] ??
            (typeof params.body.type === 'string' ? params.body.type : undefined) ??
            (typeof params.body.topic === 'string' ? params.body.topic : undefined) ??
            '';
        const secret = (this.config.get('MP_WEBHOOK_SECRET') ?? '').trim();
        if (secret && params.xSignature) {
            const isValid = this.validateWebhookSignature({
                xSignature: params.xSignature,
                xRequestId: params.xRequestId,
                dataId,
                secret,
            });
            if (!isValid) {
                this.logger.warn(`Webhook Mercado Pago rejeitado: assinatura x-signature inválida (dataId=${dataId}).`);
                throw new common_1.UnauthorizedException('Assinatura de webhook inválida.');
            }
        }
        if (!dataId) {
            return { received: true, processed: false };
        }
        const accessToken = (this.config.get('MP_ACCESS_TOKEN') ?? '').trim();
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
    async verifyAndSyncTransaction(familyAccountId, txId) {
        await this.ensureTableExists();
        const tx = await this.findTransactionById(txId);
        if (!tx || tx.familyAccountId !== familyAccountId) {
            throw new common_1.NotFoundException('Transação não encontrada.');
        }
        if (tx.status === 'APPROVED') {
            return {
                status: tx.status,
                plan: await this.planService.getPlanInfo(familyAccountId),
            };
        }
        const accessToken = (this.config.get('MP_ACCESS_TOKEN') ?? '').trim();
        if (accessToken) {
            if (tx.mpPreapprovalId) {
                await this.processPreapprovalNotification(accessToken, tx.mpPreapprovalId);
            }
            else {
                const payments = await this.searchMpPaymentsByExternalRef(accessToken, tx.id);
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
    async cancelRecurringSubscription(familyAccountId, user) {
        if (user.role !== client_1.Role.ADMIN) {
            throw new common_1.ForbiddenException('Apenas o titular (ADMIN) da conta familiar pode cancelar a renovação automática.');
        }
        await this.ensureTableExists();
        const txs = await this.findTransactionsByFamily(familyAccountId);
        const activeTx = txs.find((t) => t.paymentMode === 'CARD_RECURRING' &&
            Boolean(t.mpPreapprovalId) &&
            (t.status === 'APPROVED' || t.status === 'AUTHORIZED'));
        if (!activeTx || !activeTx.mpPreapprovalId) {
            throw new common_1.BadRequestException('Não há assinatura com renovação automática ativa nesta conta.');
        }
        const accessToken = this.getAccessTokenOrThrow();
        await this.cancelMpPreapproval(accessToken, activeTx.mpPreapprovalId);
        await this.updateTransactionStatus(activeTx.id, 'CANCELLED');
        const plan = await this.planService.getPlanInfo(familyAccountId);
        void this.notifyTelegram(`🔄 <b>Renovação automática cancelada pelo cliente</b>\n` +
            `<b>Família:</b> ${plan.familyName ?? familyAccountId}\n` +
            `<b>E-mail:</b> ${user.email}\n` +
            `<b>Acesso mantido até:</b> ${plan.premiumEndsAt ?? '-'}`);
        return {
            cancelled: true,
            message: 'Renovação automática cancelada com sucesso! Nenhuma nova cobrança será feita e seu acesso Premium continua ativo até o final do período já pago.',
            plan,
        };
    }
    async requestCdcRefund(familyAccountId, user) {
        if (user.role !== client_1.Role.ADMIN) {
            throw new common_1.ForbiddenException('Apenas o titular (ADMIN) da conta familiar pode solicitar o reembolso.');
        }
        await this.ensureTableExists();
        const summary = await this.getFamilySubscriptionSummary(familyAccountId, user.email);
        if (!summary.canRequestCdcRefund || !summary.refundableTransactionId) {
            throw new common_1.BadRequestException('O prazo legal de 7 dias corridos da primeira contratação para reembolso automático já se encerrou ou não há pagamento elegível. Caso precise de ajuda, contate nosso suporte.');
        }
        const tx = await this.findTransactionById(summary.refundableTransactionId);
        if (!tx) {
            throw new common_1.NotFoundException('Transação não encontrada para reembolso.');
        }
        const accessToken = this.getAccessTokenOrThrow();
        if (tx.mpPaymentId) {
            await this.refundMpPayment(accessToken, tx.mpPaymentId);
        }
        if (tx.mpPreapprovalId) {
            await this.cancelMpPreapproval(accessToken, tx.mpPreapprovalId).catch(() => undefined);
        }
        await this.markTransactionRefunded(tx.id, tx.amountCents);
        const plan = await this.planService.revokePremium(familyAccountId);
        void this.sendRefundConfirmationEmail(user.email, plan.familyName ?? 'sua família', tx.amountCents);
        void this.notifyTelegram(`💸 <b>Reembolso Automático CDC (7 dias) realizado</b>\n` +
            `<b>Família:</b> ${plan.familyName ?? familyAccountId}\n` +
            `<b>E-mail:</b> ${user.email}\n` +
            `<b>Valor estornado:</b> R$ ${(tx.amountCents / 100).toFixed(2).replace('.', ',')}`);
        return {
            refunded: true,
            message: 'Reembolso integral solicitado com sucesso junto ao Mercado Pago! O valor será devolvido ao mesmo meio de pagamento utilizado.',
            plan,
        };
    }
    async adminListTransactions() {
        await this.ensureTableExists();
        const pendingRows = await this.prisma.$queryRaw `
      SELECT id, status, mpPreapprovalId
      FROM subscription_transactions
      WHERE status = 'PENDING'
      ORDER BY createdAt DESC
      LIMIT 10
    `;
        await this.reconcilePendingTransactions(pendingRows);
        const rows = await this.prisma.$queryRaw `
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
            refundedAmountCents: r.refundedAmountCents !== null ? Number(r.refundedAmountCents) : null,
            createdAt: new Date(r.createdAt),
            updatedAt: new Date(r.updatedAt),
            approvedAt: r.approvedAt ? new Date(r.approvedAt) : null,
            refundedAt: r.refundedAt ? new Date(r.refundedAt) : null,
        }));
    }
    async adminClearPendingTransactions() {
        await this.ensureTableExists();
        const pendingRows = await this.prisma.$queryRaw `
      SELECT id, status, mpPreapprovalId
      FROM subscription_transactions
      WHERE status = 'PENDING'
      ORDER BY createdAt DESC
      LIMIT 20
    `;
        await this.reconcilePendingTransactions(pendingRows);
        const deletedCount = await this.prisma.$executeRaw `
      DELETE FROM subscription_transactions
      WHERE status IN ('PENDING', 'REJECTED', 'CANCELLED')
    `;
        return { deletedCount: Number(deletedCount) };
    }
    async adminRefundTransaction(txId, dto) {
        await this.ensureTableExists();
        const tx = await this.findTransactionById(txId);
        if (!tx) {
            throw new common_1.NotFoundException('Transação não encontrada.');
        }
        if (tx.status === 'REFUNDED') {
            throw new common_1.BadRequestException('Esta transação já foi estornada.');
        }
        const refundAmountCents = dto.amountCents ?? tx.amountCents;
        if (refundAmountCents > tx.amountCents) {
            throw new common_1.BadRequestException('O valor do estorno não pode ser maior que o valor pago na transação.');
        }
        const accessToken = this.getAccessTokenOrThrow();
        if (tx.mpPaymentId) {
            const isPartial = refundAmountCents < tx.amountCents;
            await this.refundMpPayment(accessToken, tx.mpPaymentId, isPartial ? Number((refundAmountCents / 100).toFixed(2)) : undefined);
        }
        if (tx.mpPreapprovalId) {
            await this.cancelMpPreapproval(accessToken, tx.mpPreapprovalId).catch(() => undefined);
        }
        await this.markTransactionRefunded(tx.id, refundAmountCents);
        const plan = await this.planService.revokePremium(tx.familyAccountId);
        const owner = await this.prisma.user.findFirst({
            where: { familyAccountId: tx.familyAccountId, role: client_1.Role.ADMIN },
            select: { email: true },
        });
        if (owner?.email) {
            void this.sendRefundConfirmationEmail(owner.email, plan.familyName ?? 'sua família', refundAmountCents);
        }
        return {
            refunded: true,
            refundedAmountCents: refundAmountCents,
            plan,
        };
    }
    async reconcilePendingTransactions(txs) {
        const accessToken = (this.config.get('MP_ACCESS_TOKEN') ?? '').trim();
        if (!accessToken)
            return false;
        const pending = txs.filter((t) => t.status === 'PENDING').slice(0, 10);
        if (pending.length === 0)
            return false;
        let anyUpdated = false;
        for (const tx of pending) {
            try {
                if (tx.mpPreapprovalId) {
                    const res = await this.processPreapprovalNotification(accessToken, tx.mpPreapprovalId);
                    if (res.processed)
                        anyUpdated = true;
                }
                else {
                    const payments = await this.searchMpPaymentsByExternalRef(accessToken, tx.id);
                    const approved = payments.find((p) => p.status === 'approved');
                    if (approved) {
                        await this.processPaymentNotification(accessToken, String(approved.id));
                        anyUpdated = true;
                    }
                    else {
                        const rejected = payments.find((p) => p.status === 'rejected' || p.status === 'cancelled');
                        if (rejected) {
                            await this.updateTransactionStatus(tx.id, 'REJECTED', String(rejected.id));
                            anyUpdated = true;
                        }
                    }
                }
            }
            catch {
            }
        }
        return anyUpdated;
    }
    async processPaymentNotification(accessToken, mpPaymentId) {
        const payment = await this.fetchMpPayment(accessToken, mpPaymentId);
        if (!payment || !payment.external_reference) {
            return { received: true, processed: false };
        }
        const tx = await this.findTransactionById(payment.external_reference);
        if (!tx) {
            return { received: true, processed: false };
        }
        if (tx.status === 'APPROVED' && tx.mpPaymentId === String(payment.id)) {
            return { received: true, processed: true, idempotent: true };
        }
        if (payment.status === 'approved') {
            await this.markTransactionApproved(tx.id, String(payment.id));
            const plan = await this.planService.grantPremium(tx.familyAccountId, tx.billingCycle);
            const owner = await this.prisma.user.findFirst({
                where: { id: tx.userId },
                select: { name: true, email: true },
            });
            if (owner) {
                void this.sendActivationEmail(owner.email, owner.name, plan.familyName ?? 'sua família', tx.billingCycle, tx.amountCents);
            }
            void this.notifyTelegram(`👑 <b>Novo pagamento Premium aprovado!</b>\n` +
                `<b>Família:</b> ${plan.familyName ?? tx.familyAccountId}\n` +
                `<b>Ciclo:</b> ${tx.billingCycle} (${tx.paymentMode})\n` +
                `<b>Valor:</b> R$ ${(tx.amountCents / 100).toFixed(2).replace('.', ',')}`);
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
    async processPreapprovalNotification(accessToken, preapprovalId) {
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
    async createMpPreference(accessToken, payload) {
        const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': (0, node_crypto_1.randomUUID)(),
            },
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const detail = await res.text();
            this.logger.error(`Erro ao criar preferência MP (${res.status}): ${detail}`);
            throw new common_1.BadGatewayException('Não foi possível iniciar o checkout no Mercado Pago. Verifique os dados e tente novamente.');
        }
        return (await res.json());
    }
    async createMpPreapproval(accessToken, payload) {
        const res = await fetch('https://api.mercadopago.com/preapproval', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': (0, node_crypto_1.randomUUID)(),
            },
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const detail = await res.text();
            throw new common_1.BadGatewayException(`Preapproval falhou (${res.status}): ${detail}`);
        }
        return (await res.json());
    }
    async fetchMpPayment(accessToken, paymentId) {
        const res = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok)
            return null;
        return (await res.json());
    }
    async searchMpPaymentsByExternalRef(accessToken, externalRef) {
        const res = await fetch(`https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(externalRef)}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok)
            return [];
        const data = (await res.json());
        return data.results ?? [];
    }
    async fetchMpPreapproval(accessToken, preapprovalId) {
        const res = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(preapprovalId)}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok)
            return null;
        return (await res.json());
    }
    async cancelMpPreapproval(accessToken, preapprovalId) {
        const res = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(preapprovalId)}`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: 'cancelled' }),
        });
        if (!res.ok) {
            const detail = await res.text();
            this.logger.error(`Falha ao cancelar assinatura no Mercado Pago (${res.status}): ${detail}`);
            throw new common_1.BadGatewayException('Não foi possível cancelar a assinatura junto ao Mercado Pago.');
        }
    }
    async refundMpPayment(accessToken, mpPaymentId, partialAmountReais) {
        const body = partialAmountReais !== undefined ? { amount: partialAmountReais } : {};
        const res = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(mpPaymentId)}/refunds`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': (0, node_crypto_1.randomUUID)(),
            },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const detail = await res.text();
            this.logger.error(`Falha ao estornar pagamento ${mpPaymentId} no Mercado Pago (${res.status}): ${detail}`);
            throw new common_1.BadGatewayException('Não foi possível processar o estorno automático no Mercado Pago. Contate o suporte.');
        }
    }
    async insertTransaction(input) {
        await this.prisma.$executeRaw `
      INSERT INTO subscription_transactions
        (id, familyAccountId, userId, billingCycle, paymentMode, amountCents, status, createdAt, updatedAt)
      VALUES
        (${input.id}, ${input.familyAccountId}, ${input.userId}, ${input.billingCycle}, ${input.paymentMode}, ${input.amountCents}, ${input.status}, NOW(3), NOW(3))
    `;
    }
    async updateTransactionMpIds(id, fields) {
        await this.prisma.$executeRaw `
      UPDATE subscription_transactions
      SET
        mpPreapprovalId = COALESCE(${fields.mpPreapprovalId ?? null}, mpPreapprovalId),
        mpPreferenceId = COALESCE(${fields.mpPreferenceId ?? null}, mpPreferenceId),
        checkoutUrl = COALESCE(${fields.checkoutUrl ?? null}, checkoutUrl),
        updatedAt = NOW(3)
      WHERE id = ${id}
    `;
    }
    async markTransactionApproved(id, mpPaymentId, mpPreapprovalId) {
        await this.prisma.$executeRaw `
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
    async updateTransactionStatus(id, status, mpPaymentId) {
        await this.prisma.$executeRaw `
      UPDATE subscription_transactions
      SET
        status = ${status},
        mpPaymentId = COALESCE(${mpPaymentId ?? null}, mpPaymentId),
        updatedAt = NOW(3)
      WHERE id = ${id}
    `;
    }
    async markTransactionRefunded(id, refundedAmountCents) {
        await this.prisma.$executeRaw `
      UPDATE subscription_transactions
      SET
        status = 'REFUNDED',
        refundedAmountCents = ${refundedAmountCents},
        refundedAt = NOW(3),
        updatedAt = NOW(3)
      WHERE id = ${id}
    `;
    }
    async findTransactionById(id) {
        const rows = await this.prisma.$queryRaw `
      SELECT
        id, familyAccountId, userId, billingCycle, paymentMode, amountCents,
        status, mpPaymentId, mpPreapprovalId, mpPreferenceId, checkoutUrl,
        refundedAmountCents, refundedAt, approvedAt, createdAt, updatedAt
      FROM subscription_transactions
      WHERE id = ${id}
      LIMIT 1
    `;
        const row = rows[0];
        if (!row)
            return null;
        return this.normalizeRow(row);
    }
    async findTransactionsByFamily(familyAccountId) {
        const rows = await this.prisma.$queryRaw `
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
    normalizeRow(row) {
        return {
            ...row,
            amountCents: Number(row.amountCents),
            refundedAmountCents: row.refundedAmountCents !== null ? Number(row.refundedAmountCents) : null,
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt),
            approvedAt: row.approvedAt ? new Date(row.approvedAt) : null,
            refundedAt: row.refundedAt ? new Date(row.refundedAt) : null,
        };
    }
    getAccessTokenOrThrow() {
        const token = (this.config.get('MP_ACCESS_TOKEN') ?? '').trim();
        if (!token) {
            throw new common_1.ServiceUnavailableException('Credenciais do Mercado Pago não configuradas no ambiente.');
        }
        return token;
    }
    resolveFrontendUrl() {
        const configured = (this.config.get('FRONTEND_URL') ?? '').trim();
        if (configured)
            return configured.replace(/\/$/, '');
        return this.config.get('NODE_ENV') === 'production'
            ? 'https://controle.aksurim.com'
            : 'http://localhost:5173';
    }
    resolveBackendUrl() {
        const configured = (this.config.get('BACKEND_URL') ?? '').trim();
        if (configured)
            return configured.replace(/\/$/, '');
        return this.config.get('NODE_ENV') === 'production'
            ? 'https://controle.aksurim.com'
            : 'http://localhost:3000';
    }
    async sendActivationEmail(to, userName, familyName, cycle, amountCents) {
        const formattedValue = `R$ ${(amountCents / 100).toFixed(2).replace('.', ',')}`;
        const cycleName = cycle === client_1.BillingCycle.MONTHLY
            ? 'Mensal'
            : cycle === client_1.BillingCycle.SEMIANNUAL
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
            .catch((err) => this.logger.warn(`Falha ao enviar e-mail de ativação para ${to}: ${err}`));
    }
    async sendRefundConfirmationEmail(to, familyName, amountCents) {
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
            .catch((err) => this.logger.warn(`Falha ao enviar e-mail de reembolso para ${to}: ${err}`));
    }
    async notifyTelegram(htmlText) {
        const botToken = this.config.get('TELEGRAM_BOT_TOKEN');
        const chatId = this.config.get('TELEGRAM_CHAT_ID');
        if (!botToken || !chatId)
            return;
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
};
exports.PlanPaymentService = PlanPaymentService;
exports.PlanPaymentService = PlanPaymentService = PlanPaymentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        plan_service_1.PlanService,
        mailer_1.MailerService])
], PlanPaymentService);
//# sourceMappingURL=plan-payment.service.js.map