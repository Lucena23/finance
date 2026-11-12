import { AuthenticatedUser } from '../auth/jwt.strategy';
import { FamilyScope } from '../common/interceptors/family-scope.interceptor';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { LockedSummaryQueryDto } from './dto/locked-summary-query.dto';
import { CheckoutSessionResult, FamilySubscriptionSummary, PlanPaymentService } from './plan-payment.service';
import { LockedMonthSummary, PlanInfo, PlanService } from './plan.service';
export declare class PlanController {
    private readonly planService;
    private readonly planPaymentService;
    constructor(planService: PlanService, planPaymentService: PlanPaymentService);
    getPlan(scope: FamilyScope): Promise<PlanInfo>;
    getLockedSummary(scope: FamilyScope, query: LockedSummaryQueryDto): Promise<LockedMonthSummary>;
    getSubscriptionSummary(scope: FamilyScope, user: AuthenticatedUser): Promise<FamilySubscriptionSummary>;
    createCheckout(scope: FamilyScope, user: AuthenticatedUser, dto: CreateCheckoutDto): Promise<CheckoutSessionResult>;
    syncTransaction(scope: FamilyScope, id: string): Promise<{
        status: string;
        plan: PlanInfo;
    }>;
    cancelSubscription(scope: FamilyScope, user: AuthenticatedUser): Promise<{
        cancelled: boolean;
        message: string;
        plan: PlanInfo;
    }>;
    requestCdcRefund(scope: FamilyScope, user: AuthenticatedUser): Promise<{
        refunded: boolean;
        message: string;
        plan: PlanInfo;
    }>;
    handleWebhook(xSignature: string | undefined, xRequestId: string | undefined, query: Record<string, string | undefined>, body: Record<string, unknown>): Promise<{
        received: boolean;
        processed: boolean;
        idempotent?: boolean;
    }>;
}
