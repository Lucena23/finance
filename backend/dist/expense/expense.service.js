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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ExpenseService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpenseService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const plan_service_1 = require("../plan/plan.service");
const prisma_service_1 = require("../prisma/prisma.service");
let ExpenseService = ExpenseService_1 = class ExpenseService {
    constructor(prisma, planService) {
        this.prisma = prisma;
        this.planService = planService;
    }
    async findAll(familyAccountId, query) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const where = {
            familyAccountId,
            deletedAt: null,
            ...(query.type !== undefined ? { type: query.type } : {}),
            ...(query.categoryId !== undefined
                ? { categoryId: query.categoryId }
                : {}),
        };
        const [data, total] = await this.prisma.$transaction([
            this.prisma.expense.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.expense.count({ where }),
        ]);
        return { data, total, page };
    }
    async findOne(familyAccountId, id) {
        const expense = await this.prisma.expense.findFirst({
            where: { id, familyAccountId, deletedAt: null },
            include: {
                paymentItems: { orderBy: { installmentNumber: 'asc' } },
            },
        });
        if (!expense) {
            throw new common_1.NotFoundException('Despesa não encontrada.');
        }
        return expense;
    }
    async create(familyAccountId, createdById, dto, userRole) {
        if (this.planService && userRole) {
            await this.planService.assertMemberCanWrite(familyAccountId, userRole);
        }
        await this.assertCategoryInScope(familyAccountId, dto.categoryId);
        const dueDate = this.parseDueDate(dto.dueDate);
        return this.prisma.$transaction(async (tx) => {
            const expense = await tx.expense.create({
                data: {
                    title: dto.title.trim(),
                    description: dto.description?.trim() ?? null,
                    type: dto.type,
                    totalAmount: dto.totalAmount,
                    categoryId: dto.categoryId,
                    familyAccountId,
                    createdById,
                },
            });
            const items = this.buildPaymentItems(expense, dueDate, dto);
            await tx.paymentItem.createMany({ data: items });
            const paymentItems = await tx.paymentItem.findMany({
                where: { expenseId: expense.id },
                orderBy: { installmentNumber: 'asc' },
            });
            return { ...expense, paymentItems };
        });
    }
    async update(familyAccountId, id, dto, userRole) {
        if (this.planService && userRole) {
            await this.planService.assertMemberCanWrite(familyAccountId, userRole);
        }
        const expense = await this.findOneOrFail(familyAccountId, id);
        if (dto.categoryId !== undefined) {
            await this.assertCategoryInScope(familyAccountId, dto.categoryId);
        }
        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.expense.update({
                where: { id },
                data: {
                    ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
                    ...(dto.description !== undefined
                        ? { description: dto.description.trim() }
                        : {}),
                    ...(dto.categoryId !== undefined
                        ? { categoryId: dto.categoryId }
                        : {}),
                    ...(dto.totalAmount !== undefined
                        ? { totalAmount: dto.totalAmount }
                        : {}),
                },
            });
            if (dto.totalAmount !== undefined && dto.totalAmount !== expense.totalAmount) {
                let newExpectedAmount = dto.totalAmount;
                let totalInst = 0;
                if (expense.type === 'INSTALLMENT') {
                    const firstItem = await tx.paymentItem.findFirst({ where: { expenseId: id } });
                    if (firstItem && firstItem.totalInstallments > 0) {
                        totalInst = firstItem.totalInstallments;
                        newExpectedAmount = Math.floor(dto.totalAmount / totalInst);
                    }
                }
                await tx.paymentItem.updateMany({
                    where: {
                        expenseId: id,
                        status: 'PENDING',
                    },
                    data: { expectedAmount: newExpectedAmount },
                });
                if (expense.type === 'INSTALLMENT' && totalInst > 0) {
                    const lastItem = await tx.paymentItem.findFirst({
                        where: { expenseId: id, installmentNumber: totalInst },
                    });
                    if (lastItem && lastItem.status === 'PENDING') {
                        const remainder = dto.totalAmount - (newExpectedAmount * totalInst);
                        if (remainder > 0) {
                            await tx.paymentItem.update({
                                where: { id: lastItem.id },
                                data: { expectedAmount: newExpectedAmount + remainder },
                            });
                        }
                    }
                }
            }
            return updated;
        });
    }
    async softDelete(familyAccountId, id, userRole) {
        if (this.planService && userRole) {
            await this.planService.assertMemberCanWrite(familyAccountId, userRole);
        }
        await this.findOneOrFail(familyAccountId, id);
        await this.prisma.expense.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }
    async restore(familyAccountId, id, userRole) {
        if (this.planService && userRole) {
            await this.planService.assertMemberCanWrite(familyAccountId, userRole);
        }
        const expense = await this.prisma.expense.findFirst({
            where: { id, familyAccountId, deletedAt: { not: null } },
        });
        if (!expense) {
            throw new common_1.NotFoundException('Despesa excluída não encontrada.');
        }
        return this.prisma.expense.update({
            where: { id },
            data: { deletedAt: null },
        });
    }
    async cancelRecurrence(familyAccountId, id, userRole) {
        if (this.planService && userRole) {
            await this.planService.assertMemberCanWrite(familyAccountId, userRole);
        }
        const expense = await this.findOneOrFail(familyAccountId, id);
        if (expense.type !== client_1.ExpenseType.RECURRENT) {
            throw new common_1.BadRequestException('Apenas despesas recorrentes podem ter a recorrência encerrada.');
        }
        if (expense.statusRecurrence === client_1.ExpenseRecurrenceStatus.CANCELLED) {
            throw new common_1.BadRequestException('A recorrência já está encerrada.');
        }
        return this.prisma.$transaction(async (tx) => {
            await tx.paymentItem.deleteMany({
                where: {
                    expenseId: id,
                    status: 'PENDING',
                    dueDate: { gt: this.today() },
                },
            });
            return tx.expense.update({
                where: { id },
                data: { statusRecurrence: client_1.ExpenseRecurrenceStatus.CANCELLED },
            });
        });
    }
    buildPaymentItems(expense, dueDate, dto) {
        switch (expense.type) {
            case client_1.ExpenseType.SINGLE:
                return this.buildSingleItems(expense, dueDate);
            case client_1.ExpenseType.INSTALLMENT:
                return this.buildInstallmentItems(expense, dueDate, dto);
            case client_1.ExpenseType.RECURRENT:
                return this.buildRecurrentItems(expense, dueDate);
            default:
                throw new common_1.BadRequestException('Tipo de despesa não suportado.');
        }
    }
    buildSingleItems(expense, dueDate) {
        return [
            {
                expenseId: expense.id,
                dueDate,
                installmentNumber: 1,
                totalInstallments: 1,
                expectedAmount: expense.totalAmount,
                status: 'PENDING',
            },
        ];
    }
    buildInstallmentItems(expense, firstDueDate, dto) {
        const total = dto.totalInstallments;
        if (total === undefined || total < 2) {
            throw new common_1.BadRequestException('totalInstallments é obrigatório (mínimo 2) para despesas parceladas.');
        }
        const baseAmount = Math.floor(expense.totalAmount / total);
        const lastAmount = expense.totalAmount - baseAmount * (total - 1);
        const items = [];
        for (let i = 1; i <= total; i += 1) {
            items.push({
                expenseId: expense.id,
                dueDate: this.addMonths(firstDueDate, i - 1),
                installmentNumber: i,
                totalInstallments: total,
                expectedAmount: i === total ? lastAmount : baseAmount,
                status: 'PENDING',
            });
        }
        return items;
    }
    buildRecurrentItems(expense, firstDueDate) {
        const items = [];
        for (let i = 0; i < ExpenseService_1.RECURRENT_PROJECTION_MONTHS; i += 1) {
            items.push({
                expenseId: expense.id,
                dueDate: this.addMonths(firstDueDate, i),
                installmentNumber: i + 1,
                totalInstallments: 0,
                expectedAmount: expense.totalAmount,
                status: 'PENDING',
            });
        }
        return items;
    }
    async assertCategoryInScope(familyAccountId, categoryId) {
        const category = await this.prisma.category.findFirst({
            where: { id: categoryId, familyAccountId },
            select: { id: true },
        });
        if (!category) {
            throw new common_1.NotFoundException('Categoria não encontrada.');
        }
    }
    async findOneOrFail(familyAccountId, id) {
        const expense = await this.prisma.expense.findFirst({
            where: { id, familyAccountId, deletedAt: null },
        });
        if (!expense) {
            throw new common_1.NotFoundException('Despesa não encontrada.');
        }
        return expense;
    }
    parseDueDate(value) {
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            throw new common_1.BadRequestException('dueDate inválido.');
        }
        return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
    }
    addMonths(date, months) {
        const year = date.getUTCFullYear();
        const month = date.getUTCMonth();
        const day = date.getUTCDate();
        const targetMonthIndex = month + months;
        const targetYear = year + Math.floor(targetMonthIndex / 12);
        const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
        const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
        const clampedDay = Math.min(day, lastDayOfTargetMonth);
        return new Date(Date.UTC(targetYear, normalizedMonth, clampedDay));
    }
    today() {
        const now = new Date();
        return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    }
};
exports.ExpenseService = ExpenseService;
ExpenseService.RECURRENT_PROJECTION_MONTHS = 12;
exports.ExpenseService = ExpenseService = ExpenseService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        plan_service_1.PlanService])
], ExpenseService);
//# sourceMappingURL=expense.service.js.map