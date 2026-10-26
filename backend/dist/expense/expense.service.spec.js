"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const expense_service_1 = require("./expense.service");
describe('ExpenseService — geração de PaymentItems', () => {
    let service;
    let prisma;
    beforeEach(() => {
        prisma = {
            $transaction: jest.fn(),
            expense: {
                create: jest.fn(),
                findMany: jest.fn(),
                findFirst: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
                count: jest.fn(),
            },
            paymentItem: {
                createMany: jest.fn(),
                findMany: jest.fn(),
                updateMany: jest.fn(),
                deleteMany: jest.fn(),
                count: jest.fn(),
            },
            category: { findFirst: jest.fn() },
        };
        service = new expense_service_1.ExpenseService(prisma);
    });
    function mockTransaction() {
        prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
    }
    function createdItems() {
        return prisma.paymentItem.createMany.mock.calls[0][0].data;
    }
    describe('SINGLE', () => {
        it('gera exatamente 1 PaymentItem com installmentNumber=1 e totalInstallments=1', async () => {
            mockTransaction();
            prisma.category.findFirst.mockResolvedValue({ id: 'cat-1' });
            prisma.expense.create.mockResolvedValue({
                id: 'exp-1',
                type: client_1.ExpenseType.SINGLE,
                totalAmount: 15075,
            });
            prisma.paymentItem.createMany.mockResolvedValue({ count: 1 });
            prisma.paymentItem.findMany.mockResolvedValue([]);
            await service.create('fam-1', 'user-1', {
                title: 'Conta de luz',
                type: client_1.ExpenseType.SINGLE,
                totalAmount: 15075,
                categoryId: 'cat-1',
                dueDate: '2026-09-20T00:00:00.000Z',
            });
            const items = createdItems();
            expect(items).toHaveLength(1);
            expect(items[0]).toMatchObject({
                installmentNumber: 1,
                totalInstallments: 1,
                expectedAmount: 15075,
                status: client_1.PaymentStatus.PENDING,
            });
            expect(items[0].dueDate.toISOString()).toBe('2026-09-20T00:00:00.000Z');
        });
        it('preserva o valor total exato em centavos (RN-04 / §8.2)', async () => {
            mockTransaction();
            prisma.category.findFirst.mockResolvedValue({ id: 'cat-1' });
            prisma.expense.create.mockResolvedValue({
                id: 'exp-1b',
                type: client_1.ExpenseType.SINGLE,
                totalAmount: 1,
            });
            prisma.paymentItem.createMany.mockResolvedValue({ count: 1 });
            prisma.paymentItem.findMany.mockResolvedValue([]);
            await service.create('fam-1', 'user-1', {
                title: 'Centavo',
                type: client_1.ExpenseType.SINGLE,
                totalAmount: 1,
                categoryId: 'cat-1',
                dueDate: '2026-09-20T00:00:00.000Z',
            });
            expect(createdItems()[0].expectedAmount).toBe(1);
        });
    });
    describe('INSTALLMENT', () => {
        it('distribui parcelas com aritmética inteira e resíduo na última', async () => {
            mockTransaction();
            prisma.category.findFirst.mockResolvedValue({ id: 'cat-1' });
            prisma.expense.create.mockResolvedValue({
                id: 'exp-2',
                type: client_1.ExpenseType.INSTALLMENT,
                totalAmount: 10000,
            });
            prisma.paymentItem.createMany.mockResolvedValue({ count: 3 });
            prisma.paymentItem.findMany.mockResolvedValue([]);
            await service.create('fam-1', 'user-1', {
                title: 'Notebook',
                type: client_1.ExpenseType.INSTALLMENT,
                totalAmount: 10000,
                categoryId: 'cat-1',
                dueDate: '2026-09-20T00:00:00.000Z',
                totalInstallments: 3,
            });
            const items = createdItems();
            expect(items).toHaveLength(3);
            expect(items[0].expectedAmount).toBe(3333);
            expect(items[1].expectedAmount).toBe(3333);
            expect(items[2].expectedAmount).toBe(3334);
        });
        it('garante que a soma das parcelas é EXATAMENTE o total (sem ponto flutuante)', async () => {
            mockTransaction();
            prisma.category.findFirst.mockResolvedValue({ id: 'cat-1' });
            prisma.expense.create.mockResolvedValue({
                id: 'exp-2b',
                type: client_1.ExpenseType.INSTALLMENT,
                totalAmount: 10000,
            });
            prisma.paymentItem.createMany.mockResolvedValue({ count: 3 });
            prisma.paymentItem.findMany.mockResolvedValue([]);
            await service.create('fam-1', 'user-1', {
                title: 'Notebook',
                type: client_1.ExpenseType.INSTALLMENT,
                totalAmount: 10000,
                categoryId: 'cat-1',
                dueDate: '2026-09-20T00:00:00.000Z',
                totalInstallments: 3,
            });
            const sum = createdItems().reduce((acc, item) => acc + item.expectedAmount, 0);
            expect(sum).toBe(10000);
        });
        it('atribui o resíduo à última parcela em divisão não exata (7 parcelas)', async () => {
            mockTransaction();
            prisma.category.findFirst.mockResolvedValue({ id: 'cat-1' });
            prisma.expense.create.mockResolvedValue({
                id: 'exp-2c',
                type: client_1.ExpenseType.INSTALLMENT,
                totalAmount: 10000,
            });
            prisma.paymentItem.createMany.mockResolvedValue({ count: 7 });
            prisma.paymentItem.findMany.mockResolvedValue([]);
            await service.create('fam-1', 'user-1', {
                title: 'Geladeira',
                type: client_1.ExpenseType.INSTALLMENT,
                totalAmount: 10000,
                categoryId: 'cat-1',
                dueDate: '2026-09-20T00:00:00.000Z',
                totalInstallments: 7,
            });
            const items = createdItems();
            expect(items).toHaveLength(7);
            expect(items.slice(0, 6).every((i) => i.expectedAmount === 1428)).toBe(true);
            expect(items[6].expectedAmount).toBe(1432);
            const sum = items.reduce((acc, item) => acc + item.expectedAmount, 0);
            expect(sum).toBe(10000);
        });
        it('incrementa o vencimento em 1 mês por parcela', async () => {
            mockTransaction();
            prisma.category.findFirst.mockResolvedValue({ id: 'cat-1' });
            prisma.expense.create.mockResolvedValue({
                id: 'exp-2d',
                type: client_1.ExpenseType.INSTALLMENT,
                totalAmount: 30000,
            });
            prisma.paymentItem.createMany.mockResolvedValue({ count: 3 });
            prisma.paymentItem.findMany.mockResolvedValue([]);
            await service.create('fam-1', 'user-1', {
                title: 'Sofá',
                type: client_1.ExpenseType.INSTALLMENT,
                totalAmount: 30000,
                categoryId: 'cat-1',
                dueDate: '2026-01-15T00:00:00.000Z',
                totalInstallments: 3,
            });
            const items = createdItems();
            expect(items[0].dueDate.toISOString()).toBe('2026-01-15T00:00:00.000Z');
            expect(items[1].dueDate.toISOString()).toBe('2026-02-15T00:00:00.000Z');
            expect(items[2].dueDate.toISOString()).toBe('2026-03-15T00:00:00.000Z');
        });
        it('faz clamp do dia para o último dia do mês destino (31/01 + 1 mês → 28/02)', async () => {
            mockTransaction();
            prisma.category.findFirst.mockResolvedValue({ id: 'cat-1' });
            prisma.expense.create.mockResolvedValue({
                id: 'exp-2e',
                type: client_1.ExpenseType.INSTALLMENT,
                totalAmount: 20000,
            });
            prisma.paymentItem.createMany.mockResolvedValue({ count: 2 });
            prisma.paymentItem.findMany.mockResolvedValue([]);
            await service.create('fam-1', 'user-1', {
                title: 'TV',
                type: client_1.ExpenseType.INSTALLMENT,
                totalAmount: 20000,
                categoryId: 'cat-1',
                dueDate: '2026-01-31T00:00:00.000Z',
                totalInstallments: 2,
            });
            const items = createdItems();
            expect(items[0].dueDate.toISOString()).toBe('2026-01-31T00:00:00.000Z');
            expect(items[1].dueDate.toISOString()).toBe('2026-02-28T00:00:00.000Z');
        });
        it('rejeita INSTALLMENT com menos de 2 parcelas', async () => {
            mockTransaction();
            prisma.category.findFirst.mockResolvedValue({ id: 'cat-1' });
            prisma.expense.create.mockResolvedValue({
                id: 'exp-3',
                type: client_1.ExpenseType.INSTALLMENT,
                totalAmount: 5000,
            });
            await expect(service.create('fam-1', 'user-1', {
                title: 'Inválida',
                type: client_1.ExpenseType.INSTALLMENT,
                totalAmount: 5000,
                categoryId: 'cat-1',
                dueDate: '2026-09-20T00:00:00.000Z',
                totalInstallments: 1,
            })).rejects.toBeInstanceOf(common_1.BadRequestException);
        });
        it('rejeita INSTALLMENT sem totalInstallments informado', async () => {
            mockTransaction();
            prisma.category.findFirst.mockResolvedValue({ id: 'cat-1' });
            prisma.expense.create.mockResolvedValue({
                id: 'exp-3b',
                type: client_1.ExpenseType.INSTALLMENT,
                totalAmount: 5000,
            });
            await expect(service.create('fam-1', 'user-1', {
                title: 'Sem parcelas',
                type: client_1.ExpenseType.INSTALLMENT,
                totalAmount: 5000,
                categoryId: 'cat-1',
                dueDate: '2026-09-20T00:00:00.000Z',
            })).rejects.toBeInstanceOf(common_1.BadRequestException);
        });
    });
    describe('RECURRENT', () => {
        it('gera projeção mensal com totalInstallments=0 e installmentNumber sequencial', async () => {
            mockTransaction();
            prisma.category.findFirst.mockResolvedValue({ id: 'cat-1' });
            prisma.expense.create.mockResolvedValue({
                id: 'exp-4',
                type: client_1.ExpenseType.RECURRENT,
                totalAmount: 8990,
            });
            prisma.paymentItem.createMany.mockResolvedValue({ count: 12 });
            prisma.paymentItem.findMany.mockResolvedValue([]);
            await service.create('fam-1', 'user-1', {
                title: 'Internet',
                type: client_1.ExpenseType.RECURRENT,
                totalAmount: 8990,
                categoryId: 'cat-1',
                dueDate: '2026-09-05T00:00:00.000Z',
            });
            const items = createdItems();
            expect(items.length).toBeGreaterThanOrEqual(1);
            expect(items[0]).toMatchObject({
                installmentNumber: 1,
                totalInstallments: 0,
                expectedAmount: 8990,
                status: client_1.PaymentStatus.PENDING,
            });
            items.forEach((item, index) => {
                expect(item.installmentNumber).toBe(index + 1);
                expect(item.totalInstallments).toBe(0);
                expect(item.expectedAmount).toBe(8990);
            });
        });
        it('replica o valor base em todos os itens da projeção', async () => {
            mockTransaction();
            prisma.category.findFirst.mockResolvedValue({ id: 'cat-1' });
            prisma.expense.create.mockResolvedValue({
                id: 'exp-4b',
                type: client_1.ExpenseType.RECURRENT,
                totalAmount: 12345,
            });
            prisma.paymentItem.createMany.mockResolvedValue({ count: 12 });
            prisma.paymentItem.findMany.mockResolvedValue([]);
            await service.create('fam-1', 'user-1', {
                title: 'Aluguel',
                type: client_1.ExpenseType.RECURRENT,
                totalAmount: 12345,
                categoryId: 'cat-1',
                dueDate: '2026-09-10T00:00:00.000Z',
            });
            expect(createdItems().every((item) => item.expectedAmount === 12345)).toBe(true);
        });
        it('edita totalAmount de RECURRENT aplicando apenas a itens PENDING (§8.4)', async () => {
            mockTransaction();
            prisma.expense.findFirst.mockResolvedValue({
                id: 'exp-5',
                type: client_1.ExpenseType.RECURRENT,
                totalAmount: 8990,
                statusRecurrence: client_1.ExpenseRecurrenceStatus.ACTIVE,
            });
            prisma.expense.update.mockResolvedValue({
                id: 'exp-5',
                type: client_1.ExpenseType.RECURRENT,
                totalAmount: 9990,
            });
            prisma.paymentItem.updateMany.mockResolvedValue({ count: 5 });
            await service.update('fam-1', 'exp-5', { totalAmount: 9990 });
            expect(prisma.paymentItem.updateMany).toHaveBeenCalledTimes(1);
            const arg = prisma.paymentItem.updateMany.mock.calls[0][0];
            expect(arg.where).toEqual({
                expenseId: 'exp-5',
                status: client_1.PaymentStatus.PENDING,
            });
            expect(arg.data).toEqual({ expectedAmount: 9990 });
        });
        it('propaga alteração de valor para itens PENDING de despesas avulsas', async () => {
            mockTransaction();
            prisma.expense.findFirst.mockResolvedValue({
                id: 'exp-6',
                type: client_1.ExpenseType.SINGLE,
                totalAmount: 5000,
                statusRecurrence: client_1.ExpenseRecurrenceStatus.ACTIVE,
            });
            prisma.expense.update.mockResolvedValue({
                id: 'exp-6',
                type: client_1.ExpenseType.SINGLE,
                totalAmount: 6000,
            });
            prisma.paymentItem.updateMany.mockResolvedValue({ count: 1 });
            await service.update('fam-1', 'exp-6', { totalAmount: 6000 });
            expect(prisma.paymentItem.updateMany).toHaveBeenCalledWith({
                where: {
                    expenseId: 'exp-6',
                    status: client_1.PaymentStatus.PENDING,
                },
                data: { expectedAmount: 6000 },
            });
        });
        it('encerra recorrência removendo apenas PaymentItems PENDING futuros (TAREFA 23)', async () => {
            mockTransaction();
            prisma.expense.findFirst.mockResolvedValue({
                id: 'exp-7',
                type: client_1.ExpenseType.RECURRENT,
                totalAmount: 8990,
                statusRecurrence: client_1.ExpenseRecurrenceStatus.ACTIVE,
            });
            prisma.paymentItem.deleteMany.mockResolvedValue({ count: 4 });
            prisma.expense.update.mockResolvedValue({
                id: 'exp-7',
                statusRecurrence: client_1.ExpenseRecurrenceStatus.CANCELLED,
            });
            await service.cancelRecurrence('fam-1', 'exp-7');
            const arg = prisma.paymentItem.deleteMany.mock.calls[0][0];
            expect(arg.where).toMatchObject({
                expenseId: 'exp-7',
                status: client_1.PaymentStatus.PENDING,
            });
            expect(arg.where.dueDate).toHaveProperty('gt');
            expect(prisma.expense.update).toHaveBeenCalledWith({
                where: { id: 'exp-7' },
                data: { statusRecurrence: client_1.ExpenseRecurrenceStatus.CANCELLED },
            });
        });
        it('rejeita encerrar recorrência de despesa não recorrente', async () => {
            prisma.expense.findFirst.mockResolvedValue({
                id: 'exp-8',
                type: client_1.ExpenseType.SINGLE,
                statusRecurrence: client_1.ExpenseRecurrenceStatus.ACTIVE,
            });
            await expect(service.cancelRecurrence('fam-1', 'exp-8')).rejects.toBeInstanceOf(common_1.BadRequestException);
        });
        it('rejeita encerrar recorrência já cancelada', async () => {
            prisma.expense.findFirst.mockResolvedValue({
                id: 'exp-9',
                type: client_1.ExpenseType.RECURRENT,
                statusRecurrence: client_1.ExpenseRecurrenceStatus.CANCELLED,
            });
            await expect(service.cancelRecurrence('fam-1', 'exp-9')).rejects.toBeInstanceOf(common_1.BadRequestException);
        });
    });
    describe('validações de escopo e entrada', () => {
        it('rejeita criação quando a categoria não pertence ao workspace', async () => {
            prisma.category.findFirst.mockResolvedValue(null);
            await expect(service.create('fam-1', 'user-1', {
                title: 'Órfã',
                type: client_1.ExpenseType.SINGLE,
                totalAmount: 1000,
                categoryId: 'cat-alheia',
                dueDate: '2026-09-20T00:00:00.000Z',
            })).rejects.toBeInstanceOf(common_1.NotFoundException);
        });
        it('rejeita dueDate inválido', async () => {
            prisma.category.findFirst.mockResolvedValue({ id: 'cat-1' });
            await expect(service.create('fam-1', 'user-1', {
                title: 'Data ruim',
                type: client_1.ExpenseType.SINGLE,
                totalAmount: 1000,
                categoryId: 'cat-1',
                dueDate: 'data-invalida',
            })).rejects.toBeInstanceOf(common_1.BadRequestException);
        });
        it('softDelete remove fisicamente despesa e itens quando não há nenhum item PAID', async () => {
            mockTransaction();
            prisma.expense.findFirst.mockResolvedValue({
                id: 'exp-unpaid',
                familyAccountId: 'fam-1',
                deletedAt: null,
            });
            prisma.paymentItem.count.mockResolvedValue(0);
            prisma.paymentItem.deleteMany.mockResolvedValue({ count: 1 });
            prisma.expense.delete.mockResolvedValue({ id: 'exp-unpaid' });
            await service.softDelete('fam-1', 'exp-unpaid');
            expect(prisma.paymentItem.deleteMany).toHaveBeenCalledWith({
                where: { expenseId: 'exp-unpaid' },
            });
            expect(prisma.expense.delete).toHaveBeenCalledWith({
                where: { id: 'exp-unpaid' },
            });
            expect(prisma.expense.update).not.toHaveBeenCalled();
        });
        it('softDelete preserva despesa com deletedAt e limpa apenas PENDING quando há item PAID', async () => {
            mockTransaction();
            prisma.expense.findFirst.mockResolvedValue({
                id: 'exp-paid',
                familyAccountId: 'fam-1',
                deletedAt: null,
            });
            prisma.paymentItem.count.mockResolvedValue(2);
            prisma.paymentItem.deleteMany.mockResolvedValue({ count: 3 });
            prisma.expense.update.mockResolvedValue({ id: 'exp-paid' });
            await service.softDelete('fam-1', 'exp-paid');
            expect(prisma.paymentItem.deleteMany).toHaveBeenCalledWith({
                where: { expenseId: 'exp-paid', status: 'PENDING' },
            });
            expect(prisma.expense.update).toHaveBeenCalled();
            expect(prisma.expense.delete).not.toHaveBeenCalled();
        });
        it('retorna 404 ao buscar despesa de outro workspace', async () => {
            prisma.expense.findFirst.mockResolvedValue(null);
            await expect(service.findOne('fam-1', 'exp-alheia')).rejects.toBeInstanceOf(common_1.NotFoundException);
        });
    });
});
//# sourceMappingURL=expense.service.spec.js.map