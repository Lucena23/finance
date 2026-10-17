"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BILLING_CYCLE_MONTHS = exports.DAY_MS = exports.PLAN_TIMEZONE = exports.FREE_MONTH_WINDOW = exports.DEFAULT_FREE_MAX_CATEGORIES = exports.DEFAULT_GRACE_DAYS = exports.DEFAULT_TRIAL_DAYS = exports.PLAN_REQUIRED_CODE = exports.PremiumFeature = void 0;
var PremiumFeature;
(function (PremiumFeature) {
    PremiumFeature["MONTH_HISTORY"] = "MONTH_HISTORY";
    PremiumFeature["REPORTS"] = "REPORTS";
    PremiumFeature["YEARLY_ANALYTICS"] = "YEARLY_ANALYTICS";
    PremiumFeature["CATEGORY_LIMIT"] = "CATEGORY_LIMIT";
    PremiumFeature["MEMBERS"] = "MEMBERS";
    PremiumFeature["FAMILY_PLAN_EXPIRED"] = "FAMILY_PLAN_EXPIRED";
})(PremiumFeature || (exports.PremiumFeature = PremiumFeature = {}));
exports.PLAN_REQUIRED_CODE = 'PLAN_REQUIRED';
exports.DEFAULT_TRIAL_DAYS = 15;
exports.DEFAULT_GRACE_DAYS = 3;
exports.DEFAULT_FREE_MAX_CATEGORIES = 5;
exports.FREE_MONTH_WINDOW = 2;
exports.PLAN_TIMEZONE = 'America/Sao_Paulo';
exports.DAY_MS = 24 * 60 * 60 * 1000;
exports.BILLING_CYCLE_MONTHS = {
    MONTHLY: 1,
    SEMIANNUAL: 6,
    ANNUAL: 12,
};
//# sourceMappingURL=plan.constants.js.map