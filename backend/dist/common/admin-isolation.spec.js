"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const rxjs_1 = require("rxjs");
const admin_service_1 = require("../admin/admin.service");
const category_service_1 = require("../category/category.service");
const expense_service_1 = require("../expense/expense.service");
const payment_item_service_1 = require("../payment-item/payment-item.service");
const global_admin_decorator_1 = require("./decorators/global-admin.decorator");
const public_decorator_1 = require("./decorators/public.decorator");
const global_admin_guard_1 = require("./guards/global-admin.guard");
const family_scope_interceptor_1 = require("./interceptors/family-scope.interceptor");
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
                continue;
            }
            if (key in record && record[key] !== value) {
                return false;
            }
        }
        return true;
    });
}
function makeUser(overrides = {}) {
    return {
        userId: 'user-1',
        email: 'user@aksurim.com',
        role: client_1.Role.MEMBER,
        familyAccountId: FAM_A,
        isGlobalAdmin: false,
        ...overrides,
    };
}
function createContext(request) {
    return {
        switchToHttp: () => ({ getRequest: () => request }),
        getHandler: () => ({}),
        getClass: () => ({}),
    };
}
function createReflector(metadata) {
    return {
        getAllAndOverride: (key) => {
            if (key === public_decorator_1.IS_PUBLIC_KEY) {
                return metadata.isPublic ?? false;
            }
            if (key === global_admin_decorator_1.GLOBAL_ADMIN_KEY) {
                return metadata.isGlobalAdminRoute ?? false;
            }
            return undefined;
        },
    };
}
function createAdminRouteReflector(isGlobalAdminRoute) {
    return {
        getAllAndOverride: (key) => key === global_admin_decorator_1.GLOBAL_ADMIN_KEY ? isGlobalAdminRoute : undefined,
    };
}
const next = { handle: () => (0, rxjs_1.of)('ok') };
describe('Isolamento Multi-Tenant pós-bypass Admin (TAREFA 30 / RN §8.3)', () => {
    describe('Bypass do Admin não contamina rotas de negócio', () => {
        it('Admin Global em rota COMUM recebe escopo familiar aplicado (sem bypass)', () => {
            const request = { user: makeUser({ isGlobalAdmin: true }) };
            const interceptor = new family_scope_interceptor_1.FamilyScopeInterceptor(createReflector({ isGlobalAdminRoute: false }));
            interceptor.intercept(createContext(request), next);
            expect(request[family_scope_interceptor_1.FAMILY_SCOPE_KEY]).toEqual({
                familyAccountId: FAM_A,
                bypass: false,
            });
        });
        it('Role.ADMIN (chefe de família) em rota @GlobalAdminOnly NÃO recebe bypass', () => {
            const request = {
                user: makeUser({ role: client_1.Role.ADMIN, isGlobalAdmin: false }),
            };
            const interceptor = new family_scope_interceptor_1.FamilyScopeInterceptor(createReflector({ isGlobalAdminRoute: true }));
            interceptor.intercept(createContext(request), next);
            expect(request[family_scope_interceptor_1.FAMILY_SCOPE_KEY]).toEqual({
                familyAccountId: FAM_A,
                bypass: false,
            });
        });
        it('bypass só ocorre com @GlobalAdminOnly E isGlobalAdmin=true', () => {
            const request = { user: makeUser({ isGlobalAdmin: true }) };
            const interceptor = new family_scope_interceptor_1.FamilyScopeInterceptor(createReflector({ isGlobalAdminRoute: true }));
            interceptor.intercept(createContext(request), next);
            expect(request[family_scope_interceptor_1.FAMILY_SCOPE_KEY]).toEqual({
                familyAccountId: '',
                bypass: true,
            });
        });
    });
    describe('Services de negócio não vazam dados cross-tenant', () => {
        it('CategoryService.findAll isola mesmo quando o usuário é Admin Global', async () => {
            const categories = [
                { id: 'cat-A1', familyAccountId: FAM_A, name: 'Energia' },
                { id: 'cat-B1', familyAccountId: FAM_B, name: 'Segredo' },
            ];
            const prisma = {
                category: {
                    findMany: jest.fn(async (args) => applyTenantFilter(categories, args?.where)),
                },
            };
            const service = new category_service_1.CategoryService(prisma);
            const result = await service.findAll(FAM_A);
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('cat-A1');
            expect(result.some((c) => c.familyAccountId === FAM_B)).toBe(false);
        });
        it('ExpenseService.findOne de outro workspace retorna 404 (sem vazamento)', async () => {
            const expenses = [
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
            const prisma = {
                expense: {
                    findFirst: jest.fn(async (args) => applyTenantFilter(expenses, args?.where)[0] ?? null),
                },
            };
            const service = new expense_service_1.ExpenseService(prisma);
            await expect(service.findOne(FAM_A, 'exp-B1')).rejects.toMatchObject({
                status: 404,
            });
        });
        it('PaymentItemService.getQueue filtra por expense.familyAccountId', async () => {
            const items = [
                {
                    id: 'pi-A1',
                    status: client_1.PaymentStatus.PENDING,
                    dueDate: new Date('2026-09-20T00:00:00.000Z'),
                    expense: { id: 'exp-A1', familyAccountId: FAM_A, deletedAt: null },
                },
                {
                    id: 'pi-B1',
                    status: client_1.PaymentStatus.PENDING,
                    dueDate: new Date('2026-09-20T00:00:00.000Z'),
                    expense: { id: 'exp-B1', familyAccountId: FAM_B, deletedAt: null },
                },
            ];
            const prisma = {
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
                            return true;
                        });
                    }),
                },
            };
            const service = new payment_item_service_1.PaymentItemService(prisma);
            const queue = await service.getQueue(FAM_A, {});
            const all = [...queue.overdue, ...queue.currentMonth, ...queue.upcoming];
            expect(all.some((i) => i.id === 'pi-B1')).toBe(false);
            expect(all.every((i) => i.id.startsWith('pi-A'))).toBe(true);
            const arg = prisma.paymentItem.findMany.mock.calls[0][0];
            expect(arg.where).toMatchObject({
                expense: { familyAccountId: FAM_A },
            });
        });
    });
    describe('AdminService cross-tenant protegido pelo GlobalAdminGuard', () => {
        it('Role.ADMIN (chefe de família) é bloqueado (403) no Painel Aksurim', () => {
            const guard = new global_admin_guard_1.GlobalAdminGuard(createAdminRouteReflector(true));
            expect(() => guard.canActivate(createContext({ user: makeUser({ role: client_1.Role.ADMIN }) }))).toThrow(common_1.ForbiddenException);
        });
        it('MEMBER comum é bloqueado (403) no Painel Aksurim', () => {
            const guard = new global_admin_guard_1.GlobalAdminGuard(createAdminRouteReflector(true));
            expect(() => guard.canActivate(createContext({ user: makeUser() }))).toThrow(common_1.ForbiddenException);
        });
        it('Admin Global é liberado no Painel Aksurim', () => {
            const guard = new global_admin_guard_1.GlobalAdminGuard(createAdminRouteReflector(true));
            expect(guard.canActivate(createContext({ user: makeUser({ isGlobalAdmin: true }) }))).toBe(true);
        });
        it('getLeads mascara o CPF e nunca expõe o valor integral (§5.5)', async () => {
            const prisma = {
                familyAccount: {
                    findMany: jest.fn().mockResolvedValue([
                        {
                            id: FAM_A,
                            name: 'Família A',
                            ownerCpf: '111.111.111-11',
                            createdAt: new Date('2026-01-01T00:00:00.000Z'),
                            users: [
                                {
                                    name: 'João',
                                    email: 'joao@aksurim.com',
                                    whatsapp: null,
                                    role: client_1.Role.ADMIN,
                                    isEmailVerified: true,
                                    createdAt: new Date('2026-01-01T00:00:00.000Z'),
                                },
                            ],
                        },
                    ]),
                },
            };
            const service = new admin_service_1.AdminService(prisma);
            const leads = await service.getLeads();
            expect(leads).toHaveLength(1);
            expect(leads[0].ownerCpfMasked).toBe('***.***.111-11');
            expect(JSON.stringify(leads)).not.toContain('111.111.111-11');
        });
    });
    describe('familyAccountId nunca é parametrizável pelo cliente', () => {
        it('bloqueia (400) familyAccountId via query em rota comum', () => {
            const request = {
                user: makeUser(),
                query: { familyAccountId: FAM_B },
            };
            const interceptor = new family_scope_interceptor_1.FamilyScopeInterceptor(createReflector({ isGlobalAdminRoute: false }));
            expect(() => interceptor.intercept(createContext(request), next)).toThrow();
            expect(request[family_scope_interceptor_1.FAMILY_SCOPE_KEY]).toBeUndefined();
        });
        it('bloqueia (400) familyAccountId via body mesmo em rota Admin Global', () => {
            const request = {
                user: makeUser({ isGlobalAdmin: true }),
                body: { familyAccountId: FAM_B },
            };
            const interceptor = new family_scope_interceptor_1.FamilyScopeInterceptor(createReflector({ isGlobalAdminRoute: true }));
            expect(() => interceptor.intercept(createContext(request), next)).toThrow();
            expect(request[family_scope_interceptor_1.FAMILY_SCOPE_KEY]).toBeUndefined();
        });
    });
    describe('Invariante do mock tenant-aware', () => {
        it('query sem escopo vaza (prova que o mock detecta regressões)', () => {
            const records = [
                { id: 'x-A', familyAccountId: FAM_A },
                { id: 'x-B', familyAccountId: FAM_B },
            ];
            expect(applyTenantFilter(records, undefined)).toHaveLength(2);
            expect(applyTenantFilter(records, { familyAccountId: FAM_A })).toHaveLength(1);
        });
    });
});
//# sourceMappingURL=admin-isolation.spec.js.map