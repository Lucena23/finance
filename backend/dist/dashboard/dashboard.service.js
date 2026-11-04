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
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const plan_service_1 = require("../plan/plan.service");
let DashboardService = class DashboardService {
    constructor(prisma, planService) {
        this.prisma = prisma;
        this.planService = planService;
    }
    async getSummary(familyAccountId, query) {
        if (this.planService) {
            await this.planService.assertMonthAccess(familyAccountId, query.month, query.year);
        }
        const { month, year } = this.resolveReferencePeriod(query);
        const monthStart = new Date(Date.UTC(year, month - 1, 1));
        const monthEnd = new Date(Date.UTC(year, month, 0));
        const [paidItems, pendingItems, members] = await this.prisma.$transaction([
            this.prisma.paymentItem.findMany({
                where: {
                    status: client_1.PaymentStatus.PAID,
                    paidAt: { gte: monthStart, lte: this.endOfDay(monthEnd) },
                    expense: { familyAccountId },
                },
                select: {
                    expectedAmount: true,
                    paidAmount: true,
                    paidById: true,
                    notes: true,
                    expense: { select: { title: true } },
                },
            }),
            this.prisma.paymentItem.findMany({
                where: {
                    status: client_1.PaymentStatus.PENDING,
                    dueDate: { gte: monthStart, lte: monthEnd },
                    expense: { familyAccountId, deletedAt: null },
                },
                select: { expectedAmount: true, dueDate: true },
            }),
            this.prisma.user.findMany({
                where: { familyAccountId },
                select: {
                    id: true,
                    name: true,
                    initials: true,
                    avatarColor: true,
                },
                orderBy: { name: 'asc' },
            }),
        ]);
        const totalPaidMonth = paidItems.reduce((sum, item) => sum + (item.paidAmount ?? 0), 0);
        const totalPendingMonth = pendingItems.reduce((sum, item) => sum + item.expectedAmount, 0);
        let totalInterestMonth = 0;
        let interestCount = 0;
        const interestItems = [];
        let totalDiscountMonth = 0;
        let discountCount = 0;
        const paidByMember = new Map();
        for (const item of paidItems) {
            const expected = item.expectedAmount ?? 0;
            const paid = item.paidAmount ?? expected;
            const isReadjustment = Boolean(item.notes?.startsWith('[Reajuste:'));
            if (paid > expected && !isReadjustment) {
                const interest = paid - expected;
                totalInterestMonth += interest;
                interestCount += 1;
                if (interestItems.length < 5) {
                    interestItems.push({
                        title: item.expense?.title ?? 'Despesa',
                        interestAmount: interest,
                        paidAmount: paid,
                    });
                }
            }
            else if (paid < expected) {
                totalDiscountMonth += expected - paid;
                discountCount += 1;
            }
            if (!item.paidById) {
                continue;
            }
            paidByMember.set(item.paidById, (paidByMember.get(item.paidById) ?? 0) + (item.paidAmount ?? 0));
        }
        const now = new Date();
        const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        let overdueCount = 0;
        let totalOverdueMonth = 0;
        for (const pending of pendingItems) {
            if (pending.dueDate && pending.dueDate.getTime() < todayUtc.getTime()) {
                overdueCount += 1;
                totalOverdueMonth += pending.expectedAmount;
            }
        }
        const memberBreakdown = members.map((member) => ({
            userId: member.id,
            name: member.name,
            initials: member.initials,
            avatarColor: member.avatarColor,
            totalPaid: paidByMember.get(member.id) ?? 0,
        }));
        return {
            totalPaidMonth,
            totalPendingMonth,
            totalInterestMonth,
            interestCount,
            interestItems,
            totalDiscountMonth,
            discountCount,
            overdueCount,
            totalOverdueMonth,
            memberBreakdown,
        };
    }
    async getCategoryDistribution(familyAccountId, query) {
        if (this.planService) {
            await this.planService.assertMonthAccess(familyAccountId, query.month, query.year);
        }
        const { month, year } = this.resolveReferencePeriod(query);
        const monthStart = new Date(Date.UTC(year, month - 1, 1));
        const monthEnd = new Date(Date.UTC(year, month, 0));
        const items = await this.prisma.paymentItem.findMany({
            where: {
                dueDate: { gte: monthStart, lte: monthEnd },
                expense: { familyAccountId },
                OR: [
                    { expense: { deletedAt: null } },
                    { status: client_1.PaymentStatus.PAID },
                ],
            },
            select: {
                status: true,
                expectedAmount: true,
                paidAmount: true,
                expense: {
                    select: {
                        category: {
                            select: { id: true, name: true, color: true },
                        },
                    },
                },
            },
        });
        const totalsByCategory = new Map();
        for (const item of items) {
            const category = item.expense.category;
            const itemAmount = item.status === client_1.PaymentStatus.PAID
                ? (item.paidAmount ?? item.expectedAmount)
                : item.expectedAmount;
            const current = totalsByCategory.get(category.id);
            if (current) {
                current.totalAmount += itemAmount;
            }
            else {
                totalsByCategory.set(category.id, {
                    name: category.name,
                    color: category.color,
                    totalAmount: itemAmount,
                });
            }
        }
        const grandTotal = Array.from(totalsByCategory.values()).reduce((sum, entry) => sum + entry.totalAmount, 0);
        const distribution = Array.from(totalsByCategory.entries()).map(([categoryId, entry]) => ({
            categoryId,
            name: entry.name,
            color: entry.color,
            totalAmount: entry.totalAmount,
            percentage: grandTotal > 0
                ? this.roundPercentage((entry.totalAmount / grandTotal) * 100)
                : 0,
        }));
        distribution.sort((a, b) => b.totalAmount - a.totalAmount);
        return distribution;
    }
    async getMonthlyEvolution(familyAccountId, query) {
        const { year } = this.resolveReferencePeriod(query);
        const hasPremium = this.planService
            ? await this.planService.hasPremiumAccess(familyAccountId)
            : true;
        const now = new Date();
        const yearStart = new Date(Date.UTC(year, 0, 1));
        const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
        const items = await this.prisma.paymentItem.findMany({
            where: {
                dueDate: { gte: yearStart, lte: yearEnd },
                expense: { familyAccountId },
                OR: [
                    { expense: { deletedAt: null } },
                    { status: client_1.PaymentStatus.PAID },
                ],
            },
            select: {
                status: true,
                dueDate: true,
                expectedAmount: true,
                paidAmount: true,
            },
        });
        const evolution = Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            totalPaid: 0,
            totalPending: 0,
        }));
        for (const item of items) {
            const itemMonth = item.dueDate.getUTCMonth();
            if (!hasPremium && !(0, plan_service_1.isPeriodAllowedForFree)({ month: itemMonth + 1, year }, now)) {
                continue;
            }
            if (item.status === 'PAID') {
                evolution[itemMonth].totalPaid += item.paidAmount ?? 0;
            }
            else {
                evolution[itemMonth].totalPending += item.expectedAmount;
            }
        }
        return evolution;
    }
    resolveReferencePeriod(query) {
        const now = new Date();
        return {
            month: query.month ?? now.getUTCMonth() + 1,
            year: query.year ?? now.getUTCFullYear(),
        };
    }
    endOfDay(date) {
        return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
    }
    roundPercentage(value) {
        return Math.round(value * 100) / 100;
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        plan_service_1.PlanService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map