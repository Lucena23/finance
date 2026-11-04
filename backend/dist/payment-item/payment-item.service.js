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
        const userNote = dto.notes?.trim() ?? '';
        const formatBrl = (cents) => (cents / 100).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        });
        if (dto.paidAmount < item.expectedAmount) {
            const diff = item.expectedAmount - dto.paidAmount;
            const handling = dto.differenceHandling === 'DISCOUNT' ? 'DISCOUNT' : 'PARTIAL';
            if (handling === 'DISCOUNT') {
                const tag = `[Desconto: -${formatBrl(diff)}]`;
                const finalNote = userNote ? `${tag} ${userNote}` : tag;
                return this.prisma.paymentItem.update({
                    where: { id },
                    data: {
                        status: client_1.PaymentStatus.PAID,
                        paidAmount: dto.paidAmount,
                        paidAt,
                        paidById,
                        notes: finalNote,
                    },
                    include: {
                        paidBy: { select: { initials: true, avatarColor: true } },
                    },
                });
            }
            const tag = `[Pagamento Parcial — Restante: ${formatBrl(diff)}]`;
            const finalNote = userNote ? `${tag} ${userNote}` : tag;
            const remainingNote = `[Saldo Restante — Original: ${formatBrl(item.expectedAmount)}]`;
            return this.prisma.$transaction(async (tx) => {
                const updatedPaid = await tx.paymentItem.update({
                    where: { id },
                    data: {
                        status: client_1.PaymentStatus.PAID,
                        expectedAmount: dto.paidAmount,
                        paidAmount: dto.paidAmount,
                        paidAt,
                        paidById,
                        notes: finalNote,
                    },
                    include: {
                        paidBy: { select: { initials: true, avatarColor: true } },
                    },
                });
                await tx.paymentItem.create({
                    data: {
                        expenseId: item.expenseId,
                        dueDate: item.dueDate,
                        installmentNumber: item.installmentNumber,
                        totalInstallments: item.totalInstallments,
                        expectedAmount: diff,
                        status: client_1.PaymentStatus.PENDING,
                        notes: remainingNote,
                    },
                });
                return updatedPaid;
            });
        }
        if (dto.paidAmount > item.expectedAmount) {
            const diff = dto.paidAmount - item.expectedAmount;
            const handling = dto.differenceHandling === 'READJUSTMENT' ? 'READJUSTMENT' : 'INTEREST';
            if (handling === 'INTEREST') {
                const tag = `[Juros/Multa: +${formatBrl(diff)}]`;
                const finalNote = userNote ? `${tag} ${userNote}` : tag;
                return this.prisma.paymentItem.update({
                    where: { id },
                    data: {
                        status: client_1.PaymentStatus.PAID,
                        paidAmount: dto.paidAmount,
                        paidAt,
                        paidById,
                        notes: finalNote,
                    },
                    include: {
                        paidBy: { select: { initials: true, avatarColor: true } },
                    },
                });
            }
            const tag = `[Reajuste: +${formatBrl(diff)}]`;
            const finalNote = userNote ? `${tag} ${userNote}` : tag;
            return this.prisma.$transaction(async (tx) => {
                const updatedPaid = await tx.paymentItem.update({
                    where: { id },
                    data: {
                        status: client_1.PaymentStatus.PAID,
                        expectedAmount: dto.paidAmount,
                        paidAmount: dto.paidAmount,
                        paidAt,
                        paidById,
                        notes: finalNote,
                    },
                    include: {
                        paidBy: { select: { initials: true, avatarColor: true } },
                    },
                });
                await tx.paymentItem.updateMany({
                    where: {
                        expenseId: item.expenseId,
                        status: client_1.PaymentStatus.PENDING,
                        id: { not: id },
                        dueDate: { gt: item.dueDate },
                    },
                    data: {
                        expectedAmount: dto.paidAmount,
                    },
                });
                const parentExpense = await tx.expense.findUnique({
                    where: { id: item.expenseId },
                    select: { type: true },
                });
                if (parentExpense?.type === 'RECURRENT' ||
                    parentExpense?.type === 'SINGLE') {
                    await tx.expense.update({
                        where: { id: item.expenseId },
                        data: { totalAmount: dto.paidAmount },
                    });
                }
                else if (parentExpense?.type === 'INSTALLMENT') {
                    const allItems = await tx.paymentItem.findMany({
                        where: { expenseId: item.expenseId },
                        select: { status: true, paidAmount: true, expectedAmount: true },
                    });
                    const newTotal = allItems.reduce((acc, cur) => acc +
                        (cur.status === client_1.PaymentStatus.PAID
                            ? (cur.paidAmount ?? cur.expectedAmount)
                            : cur.expectedAmount), 0);
                    await tx.expense.update({
                        where: { id: item.expenseId },
                        data: { totalAmount: newTotal },
                    });
                }
                return updatedPaid;
            });
        }
        const wasRemainingBalance = item.notes?.startsWith('[Saldo Restante');
        const exactNote = userNote
            ? wasRemainingBalance
                ? `[Saldo Restante Quitado] ${userNote}`
                : userNote
            : wasRemainingBalance
                ? '[Saldo Restante Quitado]'
                : null;
        return this.prisma.paymentItem.update({
            where: { id },
            data: {
                status: client_1.PaymentStatus.PAID,
                paidAmount: dto.paidAmount,
                paidAt,
                paidById,
                notes: exactNote,
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
        if (item.notes?.startsWith('[Pagamento Parcial')) {
            const pendingSibling = await this.prisma.paymentItem.findFirst({
                where: {
                    id: { not: item.id },
                    expenseId: item.expenseId,
                    installmentNumber: item.installmentNumber,
                    dueDate: item.dueDate,
                    status: client_1.PaymentStatus.PENDING,
                },
            });
            if (pendingSibling) {
                const mergedAmount = pendingSibling.expectedAmount + item.expectedAmount;
                const otherPartialsCount = await this.prisma.paymentItem.count({
                    where: {
                        id: { not: item.id },
                        expenseId: item.expenseId,
                        installmentNumber: item.installmentNumber,
                        dueDate: item.dueDate,
                        status: client_1.PaymentStatus.PAID,
                    },
                });
                return this.prisma.$transaction(async (tx) => {
                    await tx.paymentItem.delete({ where: { id: item.id } });
                    return tx.paymentItem.update({
                        where: { id: pendingSibling.id },
                        data: {
                            expectedAmount: mergedAmount,
                            notes: otherPartialsCount > 0 ? pendingSibling.notes : null,
                        },
                    });
                });
            }
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