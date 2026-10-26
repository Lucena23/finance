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
exports.PaymentItemService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const plan_service_1 = require("../plan/plan.service");
let PaymentItemService = class PaymentItemService {
    constructor(prisma, planService) {
        this.prisma = prisma;
        this.planService = planService;
    }
    async getQueue(familyAccountId, query) {
        if (this.planService) {
            await this.planService.assertMonthAccess(familyAccountId, query.month, query.year);
        }
        const today = this.today();
        const hasPremium = this.planService
            ? await this.planService.hasPremiumAccess(familyAccountId)
            : true;
        const freeWindowEnd = !hasPremium && this.planService ? this.planService.freeWindowEnd() : null;
        const items = await this.prisma.paymentItem.findMany({
            where: {
                status: client_1.PaymentStatus.PENDING,
                expense: {
                    familyAccountId,
                    deletedAt: null,
                },
            },
            include: {
                expense: { select: { title: true, categoryId: true } },
                paidBy: { select: { initials: true, avatarColor: true } },
            },
            orderBy: { dueDate: 'asc' },
        });
        const { month, year } = this.resolveReferencePeriod(query);
        const monthStart = new Date(Date.UTC(year, month - 1, 1));
        const monthEnd = new Date(Date.UTC(year, month, 0));
        const overdue = [];
        const currentMonth = [];
        const upcoming = [];
        for (const item of items) {
            const due = this.normalizeDate(item.dueDate);
            if (due.getTime() < today.getTime()) {
                overdue.push(item);
            }
            else if (due.getTime() >= monthStart.getTime() &&
                due.getTime() <= monthEnd.getTime()) {
                currentMonth.push(item);
            }
            else if (!freeWindowEnd || due.getTime() <= freeWindowEnd.getTime()) {
                upcoming.push(item);
            }
        }
        return { overdue, currentMonth, upcoming };
    }
    async pay(familyAccountId, id, paidById, dto) {
        const item = await this.findItemInScope(familyAccountId, id);
        if (item.status === client_1.PaymentStatus.PAID) {
            throw new common_1.BadRequestException('Este item já foi quitado.');
        }
        const paidAt = this.parsePaidAt(dto.paidAt);
        return this.prisma.paymentItem.update({
            where: { id },
            data: {
                status: client_1.PaymentStatus.PAID,
                paidAmount: dto.paidAmount,
                paidAt,
                paidById,
                notes: dto.notes?.trim() ?? null,
            },
            include: {
                paidBy: { select: { initials: true, avatarColor: true } },
            },
        });
    }
    async undoPay(familyAccountId, id) {
        const item = await this.prisma.paymentItem.findFirst({
            where: {
                id,
                expense: { familyAccountId },
            },
            include: {
                expense: { select: { id: true, deletedAt: true } },
            },
        });
        if (!item) {
            throw new common_1.NotFoundException('Item de pagamento não encontrado.');
        }
        if (item.status === 'PENDING') {
            throw new common_1.BadRequestException('Este item não está quitado.');
        }
        if (item.expense.deletedAt !== null) {
            await this.prisma.$transaction(async (tx) => {
                await tx.paymentItem.delete({ where: { id } });
                const remainingPaid = await tx.paymentItem.count({
                    where: { expenseId: item.expenseId, status: 'PAID' },
                });
                if (remainingPaid === 0) {
                    await tx.paymentItem.deleteMany({ where: { expenseId: item.expenseId } });
                    await tx.expense.delete({ where: { id: item.expenseId } });
                }
            });
            return {
                ...item,
                status: 'PENDING',
                paidAmount: null,
                paidAt: null,
                paidById: null,
                notes: null,
            };
        }
        return this.prisma.paymentItem.update({
            where: { id },
            data: {
                status: 'PENDING',
                paidAmount: null,
                paidAt: null,
                paidById: null,
                notes: null,
            },
        });
    }
    async updateExpectedAmount(familyAccountId, id, dto) {
        const item = await this.findItemInScope(familyAccountId, id);
        if (item.status === client_1.PaymentStatus.PAID) {
            throw new common_1.BadRequestException('Não é possível ajustar o valor de um item já quitado.');
        }
        return this.prisma.paymentItem.update({
            where: { id },
            data: { expectedAmount: dto.expectedAmount },
        });
    }
    async getHistory(familyAccountId, query) {
        if (this.planService) {
            await this.planService.assertMonthAccess(familyAccountId, query.month, query.year);
        }
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const where = {
            status: client_1.PaymentStatus.PAID,
            expense: {
                familyAccountId,
                ...(query.categoryId !== undefined
                    ? { categoryId: query.categoryId }
                    : {}),
            },
            ...(query.paidById !== undefined ? { paidById: query.paidById } : {}),
            ...this.buildPaidAtRange(query),
        };
        const [data, total] = await this.prisma.$transaction([
            this.prisma.paymentItem.findMany({
                where,
                include: {
                    paidBy: { select: { initials: true, avatarColor: true } },
                    expense: { select: { title: true, categoryId: true } },
                },
                orderBy: { paidAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.paymentItem.count({ where }),
        ]);
        return { data, total, page };
    }
    async findItemInScope(familyAccountId, id) {
        const item = await this.prisma.paymentItem.findFirst({
            where: {
                id,
                expense: { familyAccountId, deletedAt: null },
            },
        });
        if (!item) {
            throw new common_1.NotFoundException('Item de pagamento não encontrado.');
        }
        return item;
    }
    buildPaidAtRange(query) {
        if (query.month === undefined && query.year === undefined) {
            return {};
        }
        const now = new Date();
        const year = query.year ?? now.getUTCFullYear();
        const month = query.month ?? now.getUTCMonth() + 1;
        const start = new Date(Date.UTC(year, month - 1, 1));
        const end = new Date(Date.UTC(year, month, 1));
        return { paidAt: { gte: start, lt: end } };
    }
    resolveReferencePeriod(query) {
        const now = new Date();
        return {
            month: query.month ?? now.getUTCMonth() + 1,
            year: query.year ?? now.getUTCFullYear(),
        };
    }
    parsePaidAt(value) {
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            throw new common_1.BadRequestException('paidAt inválido.');
        }
        return parsed;
    }
    normalizeDate(date) {
        return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    }
    today() {
        const now = new Date();
        return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    }
};
exports.PaymentItemService = PaymentItemService;
exports.PaymentItemService = PaymentItemService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        plan_service_1.PlanService])
], PaymentItemService);
//# sourceMappingURL=payment-item.service.js.map