import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { BillingCycle } from '@prisma/client';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { AdminRefundDto } from './dto/admin-refund.dto';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { CheckoutPaymentMode, SubscriptionTxStatus } from './plan.constants';
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
}
export declare class PlanPaymentService implements OnModuleInit {
    private readonly prisma;
    private readonly config;
    private readonly planService;
    private readonly mailerService;
    private readonly logger;
    private tableEnsured;
    constructor(prisma: PrismaService, config: ConfigService, planService: PlanService, mailerService: MailerService);
    onModuleInit(): Promise<void>;
    ensureTableExists(): Promise<void>;
    isPaymentsEnabledForEmail(email?: string): boolean;
    getPricingCatalog(): PlanPricingItem[];
    reconcileFamilyPending(familyAccountId: string): Promise<void>;
    getFamilySubscriptionSummary(familyAccountId: string, userEmail?: string): Promise<FamilySubscriptionSummary>;
    createCheckout(familyAccountId: string, user: AuthenticatedUser, dto: CreateCheckoutDto): Promise<CheckoutSessionResult>;
    validateWebhookSignature(params: {
        xSignature?: string;
        xRequestId?: string;
        dataId?: string;
        secret?: string;
    }): boolean;
    handleWebhook(params: {
        xSignature?: string;
        xRequestId?: string;
        query: Record<string, string | undefined>;
        body: Record<string, unknown>;
    }): Promise<{
        received: boolean;
        processed: boolean;
        idempotent?: boolean;
    }>;
    verifyAndSyncTransaction(familyAccountId: string, txId: string): Promise<{
        status: SubscriptionTxStatus;
        plan: PlanInfo;
    }>;
    cancelRecurringSubscription(familyAccountId: string, user: AuthenticatedUser): Promise<{
        cancelled: boolean;
        message: string;
        plan: PlanInfo;
    }>;
    requestCdcRefund(familyAccountId: string, user: AuthenticatedUser): Promise<{
        refunded: boolean;
        message: string;
        plan: PlanInfo;
    }>;
    adminListTransactions(): Promise<AdminTransactionView[]>;
    adminClearPendingTransactions(): Promise<{
        deletedCount: number;
    }>;
    adminRefundTransaction(txId: string, dto: AdminRefundDto): Promise<{
        refunded: boolean;
        refundedAmountCents: number;
        plan: PlanInfo;
    }>;
    private reconcilePendingTransactions;
    private processPaymentNotification;
    private processPreapprovalNotification;
    private createMpPreference;
    private createMpPreapproval;
    private fetchMpPayment;
    private searchMpPaymentsByExternalRef;
    private fetchMpPreapproval;
    private cancelMpPreapproval;
    private refundMpPayment;
    private insertTransaction;
    private updateTransactionMpIds;
    private markTransactionApproved;
    private updateTransactionStatus;
    private markTransactionRefunded;
    private findTransactionById;
    private findTransactionsByFamily;
    private normalizeRow;
    private getAccessTokenOrThrow;
    private resolveFrontendUrl;
    private resolveBackendUrl;
    private sendActivationEmail;
    private sendRefundConfirmationEmail;
    private notifyTelegram;
}
