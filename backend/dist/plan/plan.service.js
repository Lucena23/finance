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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanService = void 0;
exports.computePlanStatus = computePlanStatus;
exports.currentPeriodInTimezone = currentPeriodInTimezone;
exports.freeAllowedPeriods = freeAllowedPeriods;
exports.isPeriodAllowedForFree = isPeriodAllowedForFree;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const plan_constants_1 = require("./plan.constants");
const plan_required_exception_1 = require("./plan-required.exception");
function computePlanStatus(dates, now, graceDays) {
    const nowMs = now.getTime();
    const { trialEndsAt, premiumEndsAt } = dates;
    if (premiumEndsAt && premiumEndsAt.getTime() > nowMs) {
        return buildComputed('PREMIUM', premiumEndsAt, nowMs);
    }
    if (trialEndsAt && trialEndsAt.getTime() > nowMs) {
        return buildComputed('TRIAL', trialEndsAt, nowMs);
    }
    const lastEndMs = Math.max(premiumEndsAt?.getTime() ?? 0, trialEndsAt?.getTime() ?? 0);
    if (lastEndMs > 0) {
        const graceEnd = new Date(lastEndMs + graceDays * plan_constants_1.DAY_MS);
        if (graceEnd.getTime() > nowMs) {
            return buildComputed('GRACE', graceEnd, nowMs);
        }
    }
    return {
        status: 'FREE',
        hasPremiumAccess: false,
        currentPeriodEndsAt: null,
        daysLeft: null,
    };
}
function buildComputed(status, endsAt, nowMs) {
    return {
        status,
        hasPremiumAccess: true,
        currentPeriodEndsAt: endsAt,
        daysLeft: Math.max(0, Math.ceil((endsAt.getTime() - nowMs) / plan_constants_1.DAY_MS)),
    };
}
function currentPeriodInTimezone(now) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: plan_constants_1.PLAN_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
    });
    const [yearPart, monthPart] = formatter.format(now).split('-');
    return { month: Number(monthPart), year: Number(yearPart) };
}
function freeAllowedPeriods(now) {
    const current = currentPeriodInTimezone(now);
    const periods = [];
    for (let offset = 0; offset < plan_constants_1.FREE_MONTH_WINDOW; offset++) {
        const index = current.year * 12 + (current.month - 1) + offset;
        periods.push({ year: Math.floor(index / 12), month: (index % 12) + 1 });
    }
    return periods;
}
function isPeriodAllowedForFree(period, now) {
    return freeAllowedPeriods(now).some((p) => p.month === period.month && p.year === period.year);
}
let PlanService = class PlanService {
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
    }
    get trialDays() {
        return this.readInt('TRIAL_DAYS', plan_constants_1.DEFAULT_TRIAL_DAYS, false);
    }
    get graceDays() {
        return this.readInt('PLAN_GRACE_DAYS', plan_constants_1.DEFAULT_GRACE_DAYS, true);
    }
    get freeMaxCategories() {
        return this.readInt('FREE_MAX_CATEGORIES', plan_constants_1.DEFAULT_FREE_MAX_CATEGORIES, false);
    }
    computeTrialEnd(from = new Date()) {
        return new Date(from.getTime() + this.trialDays * plan_constants_1.DAY_MS);
    }
    async getComputedPlan(familyAccountId) {
        const account = await this.findAccount(familyAccountId);
        return computePlanStatus(account, new Date(), this.graceDays);
    }
    async hasPremiumAccess(familyAccountId) {
        return (await this.getComputedPlan(familyAccountId)).hasPremiumAccess;
    }
    async getPlanInfo(familyAccountId) {
        const account = await this.findAccount(familyAccountId);
        const now = new Date();
        const computed = computePlanStatus(account, now, this.graceDays);
        return {
            status: computed.status,
            hasPremiumAccess: computed.hasPremiumAccess,
            trialEndsAt: account.trialEndsAt?.toISOString() ?? null,
            premiumEndsAt: account.premiumEndsAt?.toISOString() ?? null,
            currentPeriodEndsAt: computed.currentPeriodEndsAt?.toISOString() ?? null,
            daysLeft: computed.daysLeft,
            billingCycle: account.billingCycle,
            isTrialOfferEligible: computed.status === 'TRIAL',
            limits: {
                maxCategories: computed.hasPremiumAccess ? null : this.freeMaxCategories,
                allowedPeriods: computed.hasPremiumAccess ? null : freeAllowedPeriods(now),
            },
        };
    }
    async assertPremium(familyAccountId, feature, message = 'Este recurso é exclusivo do plano Premium.') {
        if (!(await this.hasPremiumAccess(familyAccountId))) {
            throw new plan_required_exception_1.PlanRequiredException(feature, message);
        }
    }
    async assertMonthAccess(familyAccountId, month, year) {
        const now = new Date();
        const current = currentPeriodInTimezone(now);
        const period = {
            month: month ?? current.month,
            year: year ?? current.year,
        };
        if (isPeriodAllowedForFree(period, now)) {
            return;
        }
        if (!(await this.hasPremiumAccess(familyAccountId))) {
            throw new plan_required_exception_1.PlanRequiredException(plan_constants_1.PremiumFeature.MONTH_HISTORY, 'Visualizar este mês é exclusivo do plano Premium.');
        }
    }
    async assertCanCreateCategory(familyAccountId) {
        if (await this.hasPremiumAccess(familyAccountId)) {
            return;
        }
        const count = await this.prisma.category.count({ where: { familyAccountId } });
        if (count >= this.freeMaxCategories) {
            throw new plan_required_exception_1.PlanRequiredException(plan_constants_1.PremiumFeature.CATEGORY_LIMIT, `O plano Free permite até ${this.freeMaxCategories} categorias. Seja Premium para criar categorias ilimitadas.`);
        }
    }
    async assertMemberCanWrite(familyAccountId, role) {
        if (role !== 'MEMBER') {
            return;
        }
        if (!(await this.hasPremiumAccess(familyAccountId))) {
            throw new plan_required_exception_1.PlanRequiredException(plan_constants_1.PremiumFeature.FAMILY_PLAN_EXPIRED, 'O plano Premium desta conta expirou. Peça ao titular para assinar e liberar suas ações.');
        }
    }
    freeWindowEnd(now = new Date()) {
        const periods = freeAllowedPeriods(now);
        const last = periods[periods.length - 1];
        return new Date(Date.UTC(last.year, last.month, 0));
    }
    async getLockedMonthSummary(familyAccountId, month, year) {
        const start = new Date(Date.UTC(year, month - 1, 1));
        const end = new Date(Date.UTC(year, month, 1));
        const aggregate = await this.prisma.paymentItem.aggregate({
            where: {
                dueDate: { gte: start, lt: end },
                expense: { familyAccountId, deletedAt: null },
            },
            _count: { _all: true },
            _sum: { expectedAmount: true },
        });
        return {
            month,
            year,
            count: aggregate._count._all,
            totalAmount: aggregate._sum.expectedAmount ?? 0,
        };
    }
    async grantPremium(familyAccountId, cycle) {
        const account = await this.findAccount(familyAccountId);
        const now = new Date();
        const base = account.premiumEndsAt && account.premiumEndsAt.getTime() > now.getTime()
            ? account.premiumEndsAt
            : now;
        const premiumEndsAt = new Date(base);
        premiumEndsAt.setMonth(premiumEndsAt.getMonth() + plan_constants_1.BILLING_CYCLE_MONTHS[cycle]);
        await this.prisma.familyAccount.update({
            where: { id: familyAccountId },
            data: { premiumEndsAt, billingCycle: cycle },
        });
        return this.getPlanInfo(familyAccountId);
    }
    async extendTrial(familyAccountId, days) {
        await this.findAccount(familyAccountId);
        await this.prisma.familyAccount.update({
            where: { id: familyAccountId },
            data: { trialEndsAt: new Date(Date.now() + days * plan_constants_1.DAY_MS) },
        });
        return this.getPlanInfo(familyAccountId);
    }
    async revokePremium(familyAccountId) {
        await this.findAccount(familyAccountId);
        const expired = new Date(Date.now() - (this.graceDays + 1) * plan_constants_1.DAY_MS);
        await this.prisma.familyAccount.update({
            where: { id: familyAccountId },
            data: { premiumEndsAt: null, billingCycle: null, trialEndsAt: expired },
        });
        return this.getPlanInfo(familyAccountId);
    }
    async findAccount(familyAccountId) {
        const account = await this.prisma.familyAccount.findUnique({
            where: { id: familyAccountId },
            select: { trialEndsAt: true, premiumEndsAt: true, billingCycle: true },
        });
        if (!account) {
            throw new common_1.NotFoundException('Conta familiar não encontrada.');
        }
        return account;
    }
    readInt(key, fallback, allowZero) {
        const raw = Number(this.config.get(key));
        if (!Number.isFinite(raw) || !Number.isInteger(raw))
            return fallback;
        if (raw < 0 || (!allowZero && raw === 0))
            return fallback;
        return raw;
    }
};
exports.PlanService = PlanService;
exports.PlanService = PlanService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], PlanService);
//# sourceMappingURL=plan.service.js.map