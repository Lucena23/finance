export type PlanStatus = 'TRIAL' | 'PREMIUM' | 'GRACE' | 'FREE';
export declare enum PremiumFeature {
    MONTH_HISTORY = "MONTH_HISTORY",
    REPORTS = "REPORTS",
    YEARLY_ANALYTICS = "YEARLY_ANALYTICS",
    CATEGORY_LIMIT = "CATEGORY_LIMIT",
    MEMBERS = "MEMBERS",
    FAMILY_PLAN_EXPIRED = "FAMILY_PLAN_EXPIRED"
}
export declare const PLAN_REQUIRED_CODE = "PLAN_REQUIRED";
export declare const DEFAULT_TRIAL_DAYS = 15;
export declare const DEFAULT_GRACE_DAYS = 3;
export declare const DEFAULT_FREE_MAX_CATEGORIES = 5;
export declare const FREE_MONTH_WINDOW = 2;
export declare const PLAN_TIMEZONE = "America/Sao_Paulo";
export declare const DAY_MS: number;
export declare const BILLING_CYCLE_MONTHS: {
    readonly MONTHLY: 1;
    readonly SEMIANNUAL: 6;
    readonly ANNUAL: 12;
};
