"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const category_service_1 = require("../category/category.service");
const expense_service_1 = require("../expense/expense.service");
const family_account_service_1 = require("../family-account/family-account.service");
const notification_service_1 = require("../notification/notification.service");
const payment_item_service_1 = require("../payment-item/payment-item.service");
const FAM_A = 'fam-A';
const FAM_B = 'fam-B';
function applyTenantFilter(records, where) {
    if (!where) {
        return records;
    }
    return records.filter((record) => {
        for (const [key, value] of Object.entries(where)) {
            if (key === 'familyAccountId') {
                if (record.familyAccountId !== value) {
                    return false;
                }
                continue;
            }
            if (key === 'id') {
                if (record.id !== value) {
                    return false;
                }
                continue;
            }
            if (key === 'deletedAt') {
                if (value === null && record.deletedAt !== null) {
                    return false;
                }
                if (typeof value === 'object' &&
                    value !== null &&
                    'not' in value &&
                    value.not === null &&
                    record.deletedAt === null) {
                    return false;
                }
                continue;
            }
            if (key in record && record[key] !== value) {
                return false;
            }
        }
        return true;
    });
}
describe('Isolamento Multi-Tenant (RN-01 / §8.3) — TAREFA 53', () => {
    describe('CategoryService', () => {
        let service;
        let categories;
        let prisma;
        beforeEach(() => {
            categories = [
                { id: 'cat-A1', familyAccountId: FAM_A, name: 'Energia' },
                { id: 'cat-B1', familyAccountId: FAM_B, name: 'Segredo do vizinho' },
            ];
            prisma = {
                category: {
                    findMany: jest.fn(async (args) => applyTenantFilter(categories, args?.where)),
                    findFirst: jest.fn(async (args) => applyTenantFilter(categories, args?.where)[0] ?? null),
                    create: jest.fn(),
                    update: jest.fn(),
                    delete: jest.fn(),
                },
                expense: { count: jest.fn().mockResolvedValue(0) },
            };
            service = new category_service_1.CategoryService(prisma);
        });
        it('findAll retorna APENAS categorias do workspace autenticado', async () => {
            const result = await service.findAll(FAM_A);
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('cat-A1');
            expect(result.some((c) => c.familyAccountId === FAM_B)).toBe(false);
        });
        it('findAll inclui o filtro familyAccountId na query (nunca sem escopo)', async () => {
            await service.findAll(FAM_A);
            const arg = prisma.category.findMany.mock.calls[0][0];
            expect(arg.where).toMatchObject({ familyAccountId: FAM_A });
        });
        it('update de categoria de OUTRO workspace retorna 404 (não vaza dados)', async () => {
            await expect(service.update(FAM_A, 'cat-B1', { name: 'Invadida' })).rejects.toBeInstanceOf(common_1.NotFoundException);
            const arg = prisma.category.findFirst.mock.calls[0][0];
            expect(arg.where).toMatchObject({ id: 'cat-B1', familyAccountId: FAM_A });
            expect(prisma.category.update).not.toHaveBeenCalled();
        });
        it('remove de categoria de OUTRO workspace retorna 404 e não deleta', async () => {
            await expect(service.remove(FAM_A, 'cat-B1')).rejects.toBeInstanceOf(common_1.NotFoundException);
            expect(prisma.category.delete).not.toHaveBeenCalled();
        });
        it('remove bloqueia (409) quando há despesas vinculadas no workspace', async () => {
            prisma.expense.count.mockResolvedValue(2);
            await expect(service.remove(FAM_A, 'cat-A1')).rejects.toMatchObject({
                status: 409,
            });
            const arg = prisma.expense.count.mock.calls[0][0];
            expect(arg.where).toMatchObject({
                categoryId: 'cat-A1',
                familyAccountId: FAM_A,
            });
        });
    });
    describe('ExpenseService', () => {
        let service;
        let expenses;
        let prisma;
        beforeEach(() => {
            expenses = [
                {
                    id: 'exp-A1',
                    familyAccountId: FAM_A,
                    type: client_1.ExpenseType.SINGLE,
                    totalAmount: 5000,
                    deletedAt: null,
                    statusRecurrence: client_1.ExpenseRecurrenceStatus.ACTIVE,
                },
                {
                    id: 'exp-B1',
                    familyAccountId: FAM_B,
                    type: client_1.ExpenseType.SINGLE,
                    totalAmount: 999999,
                    deletedAt: null,
                    statusRecurrence: client_1.ExpenseRecurrenceStatus.ACTIVE,
                },
            ];
            prisma = {
                $transaction: jest.fn(),
                expense: {
                    findMany: jest.fn(async (args) => applyTenantFilter(expenses, args?.where)),
                    findFirst: jest.fn(async (args) => applyTenantFilter(expenses, args?.where)[0] ?? null),
                    create: jest.fn(),
                    update: jest.fn(),
                    count: jest.fn().mockResolvedValue(0),
                },
                paymentItem: {
                    createMany: jest.fn(),
                    findMany: jest.fn().mockResolvedValue([]),
                    updateMany: jest.fn(),
                    deleteMany: jest.fn(),
                },
                category: { findFirst: jest.fn() },
            };
            prisma.$transaction.mockImplementation(async (arg) => {
                if (typeof arg === 'function') {
                    return arg(prisma);
                }
                return Promise.all(arg);
            });
            service = new expense_service_1.ExpenseService(prisma);
        });
        it('findAll retorna apenas despesas do workspace autenticado', async () => {
            const result = await service.findAll(FAM_A, {});
            expect(result.data).toHaveLength(1);
            expect(result.data[0].id).toBe('exp-A1');
            expect(result.data.some((e) => e.familyAccountId === FAM_B)).toBe(false);
        });
        it('findAll aplica familyAccountId e deletedAt IS NULL na query', async () => {
            await service.findAll(FAM_A, {});
            const arg = prisma.expense.findMany.mock.calls[0][0];
            expect(arg.where).toMatchObject({
                familyAccountId: FAM_A,
                deletedAt: null,
            });
        });
        it('findOne de despesa de OUTRO workspace retorna 404', async () => {
            await expect(service.findOne(FAM_A, 'exp-B1')).rejects.toBeInstanceOf(common_1.NotFoundException);
        });
        it('softDelete de despesa de OUTRO workspace retorna 404 e não altera', async () => {
            await expect(service.softDelete(FAM_A, 'exp-B1')).rejects.toBeInstanceOf(common_1.NotFoundException);
            expect(prisma.expense.update).not.toHaveBeenCalled();
        });
        it('restore de despesa de OUTRO workspace retorna 404', async () => {
            await expect(service.restore(FAM_A, 'exp-B1')).rejects.toBeInstanceOf(common_1.NotFoundException);
        });
        it('cancelRecurrence de despesa de OUTRO workspace retorna 404', async () => {
            await expect(service.cancelRecurrence(FAM_A, 'exp-B1')).rejects.toBeInstanceOf(common_1.NotFoundException);
            expect(prisma.paymentItem.deleteMany).not.toHaveBeenCalled();
        });
        it('create rejeita categoria pertencente a OUTRO workspace (404)', async () => {
            prisma.category.findFirst.mockImplementation(async (args) => {
                const cats = [
                    { id: 'cat-B1', familyAccountId: FAM_B },
                ];
                return applyTenantFilter(cats, args?.where)[0] ?? null;
            });
            await expect(service.create(FAM_A, 'user-A', {
                title: 'Despesa órfã',
                type: client_1.ExpenseType.SINGLE,
                totalAmount: 1000,
                categoryId: 'cat-B1',
                dueDate: '2026-09-20T00:00:00.000Z',
            })).rejects.toBeInstanceOf(common_1.NotFoundException);
            expect(prisma.expense.create).not.toHaveBeenCalled();
        });
        it('create grava a despesa com o familyAccountId do escopo autenticado', async () => {
            prisma.category.findFirst.mockResolvedValue({ id: 'cat-A1' });
            prisma.expense.create.mockImplementation(async (args) => ({
                id: 'exp-new',
                ...args.data,
            }));
            await service.create(FAM_A, 'user-A', {
                title: 'Nova',
                type: client_1.ExpenseType.SINGLE,
                totalAmount: 1000,
                categoryId: 'cat-A1',
                dueDate: '2026-09-20T00:00:00.000Z',
            });
            const arg = prisma.expense.create.mock.calls[0][0];
            expect(arg.data.familyAccountId).toBe(FAM_A);
            expect(arg.data.createdById).toBe('user-A');
        });
    });
    describe('PaymentItemService', () => {
        let service;
        let items;
        let prisma;
        beforeEach(() => {
            items = [
                {
                    id: 'pi-A1',
                    familyAccountId: FAM_A,
                    status: client_1.PaymentStatus.PENDING,
                    dueDate: new Date('2026-09-20T00:00:00.000Z'),
                    expense: { id: 'exp-A1', familyAccountId: FAM_A, deletedAt: null },
                },
                {
                    id: 'pi-B1',
                    familyAccountId: FAM_B,
                    status: client_1.PaymentStatus.PENDING,
                    dueDate: new Date('2026-09-20T00:00:00.000Z'),
                    expense: { id: 'exp-B1', familyAccountId: FAM_B, deletedAt: null },
                },
            ];
            prisma = {
                paymentItem: {
                    findMany: jest.fn(async (args) => {
                        const where = args?.where ?? {};
                        const expenseFilter = (where.expense ?? {});
                        return items.filter((item) => {
                            if (where.status !== undefined &&
                                item.status !== where.status) {
                                return false;
                            }
                            if (expenseFilter.familyAccountId !== undefined &&
                                item.expense.familyAccountId !==
                                    expenseFilter.familyAccountId) {
                                return false;
                            }
                            if (expenseFilter.deletedAt === null &&
                                item.expense.deletedAt !== null) {
                                return false;
                            }
                            return true;
                        });
                    }),
                },
            };
            service = new payment_item_service_1.PaymentItemService(prisma);
        });
        it('getQueue retorna apenas itens do workspace autenticado', async () => {
            const queue = await service.getQueue(FAM_A, {});
            const all = [...queue.overdue, ...queue.currentMonth, ...queue.upcoming];
            expect(all.some((i) => i.id === 'pi-B1')).toBe(false);
            expect(all.every((i) => i.id.startsWith('pi-A'))).toBe(true);
        });
        it('getQueue filtra por expense.familyAccountId e deletedAt IS NULL', async () => {
            await service.getQueue(FAM_A, {});
            const arg = prisma.paymentItem.findMany.mock.calls[0][0];
            expect(arg.where).toMatchObject({
                status: client_1.PaymentStatus.PENDING,
                expense: { familyAccountId: FAM_A, deletedAt: null },
            });
        });
        it('getQueue NÃO retorna itens de despesas soft-deleted do próprio workspace', async () => {
            items.push({
                id: 'pi-A2',
                familyAccountId: FAM_A,
                status: client_1.PaymentStatus.PENDING,
                dueDate: new Date('2026-09-21T00:00:00.000Z'),
                expense: { id: 'exp-A2', familyAccountId: FAM_A, deletedAt: new Date() },
            });
            const queue = await service.getQueue(FAM_A, {});
            const all = [...queue.overdue, ...queue.currentMonth, ...queue.upcoming];
            expect(all.some((i) => i.id === 'pi-A2')).toBe(false);
        });
    });
    describe('FamilyAccountService', () => {
        let service;
        let families;
        let prisma;
        beforeEach(() => {
            families = [
                {
                    id: FAM_A,
                    name: 'Família A',
                    ownerCpf: '111.111.111-11',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    id: FAM_B,
                    name: 'Família B',
                    ownerCpf: '222.222.222-22',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];
            prisma = {
                familyAccount: {
                    findUnique: jest.fn(async (args) => {
                        const { id, ownerCpf } = args.where;
                        return (families.find((f) => (id !== undefined && f.id === id) ||
                            (ownerCpf !== undefined && f.ownerCpf === ownerCpf)) ?? null);
                    }),
                    create: jest.fn(),
                    update: jest.fn(),
                },
            };
            service = new family_account_service_1.FamilyAccountService(prisma);
        });
        it('findCurrent retorna o workspace do escopo autenticado', async () => {
            const view = await service.findCurrent(FAM_A);
            expect(view.id).toBe(FAM_A);
            expect(view.name).toBe('Família A');
        });
        it('findCurrent NUNCA retorna dados de outro workspace', async () => {
            const view = await service.findCurrent(FAM_A);
            expect(view.id).not.toBe(FAM_B);
            expect(view.name).not.toBe('Família B');
        });
        it('findCurrent mascara o CPF na view pública (§5.5)', async () => {
            const view = await service.findCurrent(FAM_A);
            expect(view.ownerCpfMasked).toBe('***.***.111-11');
            expect(JSON.stringify(view)).not.toContain('111.111.111-11');
        });
        it('findCurrent de workspace inexistente retorna 404', async () => {
            await expect(service.findCurrent('fam-inexistente')).rejects.toBeInstanceOf(common_1.NotFoundException);
        });
        it('update só altera o workspace do escopo autenticado', async () => {
            prisma.familyAccount.update.mockImplementation(async (args) => {
                const target = families.find((f) => f.id === args.where.id);
                return { ...target, ...args.data };
            });
            await service.update(FAM_A, { name: 'Família A Renomeada' });
            const arg = prisma.familyAccount.update.mock.calls[0][0];
            expect(arg.where).toEqual({ id: FAM_A });
            expect(arg.where.id).not.toBe(FAM_B);
        });
    });
    describe('NotificationService', () => {
        let service;
        let subscriptions;
        let prisma;
        beforeEach(() => {
            subscriptions = [
                {
                    id: 'sub-A',
                    userId: 'user-A',
                    endpoint: 'https://push.example/A',
                    p256dh: 'keyA',
                    auth: 'authA',
                },
                {
                    id: 'sub-B',
                    userId: 'user-B',
                    endpoint: 'https://push.example/B',
                    p256dh: 'keyB',
                    auth: 'authB',
                },
            ];
            prisma = {
                pushSubscription: {
                    findFirst: jest.fn(async (args) => subscriptions.find((s) => s.userId === args.where.userId &&
                        s.endpoint === args.where.endpoint) ?? null),
                    create: jest.fn(),
                    update: jest.fn(),
                    deleteMany: jest.fn(async (args) => {
                        const before = subscriptions.length;
                        subscriptions = subscriptions.filter((s) => !(s.userId === args.where.userId &&
                            s.endpoint === args.where.endpoint));
                        return { count: before - subscriptions.length };
                    }),
                },
            };
            service = new notification_service_1.NotificationService(prisma);
        });
        it('unsubscribe só remove a subscription do próprio usuário', async () => {
            await service.unsubscribe('user-A', {
                endpoint: 'https://push.example/B',
            });
            expect(subscriptions.some((s) => s.id === 'sub-B')).toBe(true);
            expect(subscriptions).toHaveLength(2);
        });
        it('unsubscribe remove a subscription do próprio usuário', async () => {
            await service.unsubscribe('user-A', {
                endpoint: 'https://push.example/A',
            });
            expect(subscriptions.some((s) => s.id === 'sub-A')).toBe(false);
            expect(subscriptions.some((s) => s.id === 'sub-B')).toBe(true);
        });
        it('subscribe de outro usuário não sobrescreve subscription alheia', async () => {
            prisma.pushSubscription.create.mockImplementation(async (args) => ({
                id: 'sub-new',
                ...args.data,
            }));
            await service.subscribe('user-A', {
                endpoint: 'https://push.example/B',
                keys: { p256dh: 'novo', auth: 'novo' },
            });
            expect(prisma.pushSubscription.update).not.toHaveBeenCalled();
            expect(prisma.pushSubscription.create).toHaveBeenCalledTimes(1);
            const arg = prisma.pushSubscription.create.mock.calls[0][0];
            expect(arg.data.userId).toBe('user-A');
        });
    });
    describe('Invariante global de escopo', () => {
        it('o mock tenant-aware expõe vazamento quando o filtro é omitido', () => {
            const records = [
                { id: 'x-A', familyAccountId: FAM_A },
                { id: 'x-B', familyAccountId: FAM_B },
            ];
            expect(applyTenantFilter(records, undefined)).toHaveLength(2);
            expect(applyTenantFilter(records, { familyAccountId: FAM_A })).toHaveLength(1);
            expect(applyTenantFilter(records, { familyAccountId: FAM_A })[0].id).toBe('x-A');
        });
        it('Role enum permanece estável para os testes de autorização', () => {
            expect(client_1.Role.ADMIN).toBe('ADMIN');
            expect(client_1.Role.MEMBER).toBe('MEMBER');
        });
    });
});
//# sourceMappingURL=multi-tenant-isolation.spec.js.map