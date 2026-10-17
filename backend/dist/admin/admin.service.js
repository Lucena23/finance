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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const cpf_util_1 = require("../common/utils/cpf.util");
const prisma_service_1 = require("../prisma/prisma.service");
const plan_service_1 = require("../plan/plan.service");
const update_family_plan_dto_1 = require("./dto/update-family-plan.dto");
let AdminService = class AdminService {
    constructor(prisma, planService) {
        this.prisma = prisma;
        this.planService = planService;
    }
    async getGlobalMetrics() {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const [totalFamilies, totalUsers, totalActiveUsers, totalExpenses, paidAggregate, pendingAggregate, familiesCreatedLast30Days, usersCreatedLast30Days,] = await this.prisma.$transaction([
            this.prisma.familyAccount.count(),
            this.prisma.user.count(),
            this.prisma.user.count({ where: { isEmailVerified: true } }),
            this.prisma.expense.count({ where: { deletedAt: null } }),
            this.prisma.paymentItem.aggregate({
                where: { status: 'PAID' },
                _sum: { paidAmount: true },
            }),
            this.prisma.paymentItem.aggregate({
                where: { status: 'PENDING' },
                _sum: { expectedAmount: true },
            }),
            this.prisma.familyAccount.count({
                where: { createdAt: { gte: thirtyDaysAgo } },
            }),
            this.prisma.user.count({
                where: { createdAt: { gte: thirtyDaysAgo } },
            }),
        ]);
        return {
            totalFamilies,
            totalUsers,
            totalActiveUsers,
            totalExpenses,
            totalPaidAmount: paidAggregate._sum.paidAmount ?? 0,
            totalPendingAmount: pendingAggregate._sum.expectedAmount ?? 0,
            familiesCreatedLast30Days,
            usersCreatedLast30Days,
        };
    }
    async getLeads() {
        const families = await this.prisma.familyAccount.findMany({
            select: {
                id: true,
                name: true,
                ownerCpf: true,
                trialEndsAt: true,
                premiumEndsAt: true,
                billingCycle: true,
                createdAt: true,
                users: {
                    select: {
                        name: true,
                        email: true,
                        whatsapp: true,
                        role: true,
                        isEmailVerified: true,
                        createdAt: true,
                    },
                    orderBy: { createdAt: 'asc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        const now = new Date();
        const graceDays = this.planService?.graceDays ?? 3;
        const leads = [];
        for (const family of families) {
            const computed = (0, plan_service_1.computePlanStatus)({
                trialEndsAt: family.trialEndsAt ?? null,
                premiumEndsAt: family.premiumEndsAt ?? null,
            }, now, graceDays);
            for (const user of family.users) {
                leads.push({
                    familyAccountId: family.id,
                    familyName: family.name,
                    ownerCpfMasked: (0, cpf_util_1.maskCpfForDisplay)(family.ownerCpf),
                    userName: user.name,
                    userEmail: user.email,
                    userWhatsapp: user.whatsapp,
                    userRole: user.role,
                    isEmailVerified: user.isEmailVerified,
                    createdAt: user.createdAt.toISOString(),
                    planStatus: computed.status,
                    planDaysLeft: computed.daysLeft,
                    billingCycle: family.billingCycle ?? null,
                });
            }
        }
        return leads;
    }
    async updateFamilyPlan(targetFamilyId, dto) {
        if (!this.planService) {
            throw new common_1.BadRequestException('PlanService indisponível.');
        }
        switch (dto.action) {
            case update_family_plan_dto_1.AdminPlanAction.GRANT_PREMIUM:
                return this.planService.grantPremium(targetFamilyId, dto.billingCycle ?? client_1.BillingCycle.MONTHLY);
            case update_family_plan_dto_1.AdminPlanAction.EXTEND_TRIAL:
                return this.planService.extendTrial(targetFamilyId, dto.trialDays ?? this.planService.trialDays);
            case update_family_plan_dto_1.AdminPlanAction.REVOKE:
                return this.planService.revokePremium(targetFamilyId);
            default:
                throw new common_1.BadRequestException('Ação de plano inválida.');
        }
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        plan_service_1.PlanService])
], AdminService);
//# sourceMappingURL=admin.service.js.map