import { BillingCycle } from '@prisma/client';
export declare enum AdminPlanAction {
    GRANT_PREMIUM = "GRANT_PREMIUM",
    EXTEND_TRIAL = "EXTEND_TRIAL",
    REVOKE = "REVOKE"
}
export declare class UpdateFamilyPlanDto {
    action: AdminPlanAction;
    billingCycle?: BillingCycle;
    trialDays?: number;
}
