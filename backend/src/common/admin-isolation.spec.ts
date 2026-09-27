import { CallHandler, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ExpenseRecurrenceStatus,
  ExpenseType,
  PaymentStatus,
  Role,
} from '@prisma/client';
import { of } from 'rxjs';

import { AdminService } from '../admin/admin.service';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { CategoryService } from '../category/category.service';
import { ExpenseService } from '../expense/expense.service';
import { PaymentItemService } from '../payment-item/payment-item.service';
import { PrismaService } from '../prisma/prisma.service';
import { GLOBAL_ADMIN_KEY } from './decorators/global-admin.decorator';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { GlobalAdminGuard } from './guards/global-admin.guard';
import {
  FAMILY_SCOPE_KEY,
  FamilyScope,
  FamilyScopeInterceptor,
} from './interceptors/family-scope.interceptor';

/**
 * TAREFA 30 — Validação estrita do isolamento multi-tenant (RN §8.3)
 * APÓS a introdução do bypass do Admin Global (RN-15 / TAREFA 24).
 *
 * Objetivo: provar que o bypass do escopo familiar concedido ao Painel
 * Aksurim NÃO abre brecha de vazamento cross-tenant nas rotas de negócio.
 *
 * Cenários cobertos:
 *  1. Um Admin Global acessando uma rota COMUM continua com escopo aplicado
 *     (o bypass exige @GlobalAdminOnly() na rota — não basta ser admin).
 *  2. Um Admin Global NÃO consegue ler dados de outro workspace via services
 *     de negócio (Category/Expense/PaymentItem) — o filtro familyAccountId
 *     permanece obrigatório.
 *  3. O bypass só é concedido quando rota @GlobalAdminOnly() E isGlobalAdmin.
 *  4. O AdminService (cross-tenant EXPLÍCITO) só é alcançável por rotas
 *     protegidas pelo GlobalAdminGuard — Role.ADMIN é bloqueado (403).
 *  5. `familyAccountId` nunca é aceito do cliente, nem em rota Admin Global.
 *  6. O mock tenant-aware expõe qualquer query que esqueça o escopo.
 */

const FAM_A = 'fam-A';
const FAM_B = 'fam-B';

interface TenantRecord {
  id: string;
  familyAccountId?: string;
  [key: string]: unknown;
}

/**
 * Request mockado com índice dinâmico para permitir a leitura de
 * `request[FAMILY_SCOPE_KEY]` sob `strict` sem recorrer a `any`.
 */
interface MockRequest {
  user?: AuthenticatedUser;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  params?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Simula o MySQL de forma tenant-aware: só retorna linhas cujo
 * `familyAccountId` casa com o filtro. Se o `where` omitir o escopo,
 * retorna TODAS as linhas (inclusive de outros tenants) — expondo vazamentos.
 */
function applyTenantFilter(
  records: TenantRecord[],
  where: Record<string, unknown> | undefined,
): TenantRecord[] {
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

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    userId: 'user-1',
    email: 'user@aksurim.com',
    role: Role.MEMBER,
    familyAccountId: FAM_A,
    isGlobalAdmin: false,
    ...overrides,
  };
}

function createContext(request: MockRequest): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

function createReflector(metadata: {
  isPublic?: boolean;
  isGlobalAdminRoute?: boolean;
}): Reflector {
  return {
    getAllAndOverride: (key: string) => {
      if (key === IS_PUBLIC_KEY) {
        return metadata.isPublic ?? false;
      }
      if (key === GLOBAL_ADMIN_KEY) {
        return metadata.isGlobalAdminRoute ?? false;
      }
      return undefined;
    },
  } as unknown as Reflector;
}

/**
 * Reflector simplificado para o GlobalAdminGuard: responde apenas à chave
 * GLOBAL_ADMIN_KEY com o booleano informado.
 */
function createAdminRouteReflector(isGlobalAdminRoute: boolean): Reflector {
  return {
    getAllAndOverride: (key: string) =>
      key === GLOBAL_ADMIN_KEY ? isGlobalAdminRoute : undefined,
  } as unknown as Reflector;
}

const next: CallHandler = { handle: () => of('ok') };

describe('Isolamento Multi-Tenant pós-bypass Admin (TAREFA 30 / RN §8.3)', () => {
  // ─────────────────────────────────────────────────────────────
  // 1. O bypass NÃO vaza para rotas comuns
  // ─────────────────────────────────────────────────────────────
  describe('Bypass do Admin não contamina rotas de negócio', () => {
    it('Admin Global em rota COMUM recebe escopo familiar aplicado (sem bypass)', () => {
      const request: MockRequest = { user: makeUser({ isGlobalAdmin: true }) };
      const interceptor = new FamilyScopeInterceptor(
        createReflector({ isGlobalAdminRoute: false }),
      );

      interceptor.intercept(createContext(request), next);

      expect(request[FAMILY_SCOPE_KEY]).toEqual({
        familyAccountId: FAM_A,
        bypass: false,
      } satisfies FamilyScope);
    });

    it('Role.ADMIN (chefe de família) em rota @GlobalAdminOnly NÃO recebe bypass', () => {
      const request: MockRequest = {
        user: makeUser({ role: Role.ADMIN, isGlobalAdmin: false }),
      };
      const interceptor = new FamilyScopeInterceptor(
        createReflector({ isGlobalAdminRoute: true }),
      );

      interceptor.intercept(createContext(request), next);

      expect(request[FAMILY_SCOPE_KEY]).toEqual({
        familyAccountId: FAM_A,
        bypass: false,
      } satisfies FamilyScope);
    });

    it('bypass só ocorre com @GlobalAdminOnly E isGlobalAdmin=true', () => {
      const request: MockRequest = { user: makeUser({ isGlobalAdmin: true }) };
      const interceptor = new FamilyScopeInterceptor(
        createReflector({ isGlobalAdminRoute: true }),
      );

      interceptor.intercept(createContext(request), next);

      expect(request[FAMILY_SCOPE_KEY]).toEqual({
        familyAccountId: '',
        bypass: true,
      } satisfies FamilyScope);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Services de negócio permanecem isolados mesmo para Admin Global
  // ─────────────────────────────────────────────────────────────
  describe('Services de negócio não vazam dados cross-tenant', () => {
    it('CategoryService.findAll isola mesmo quando o usuário é Admin Global', async () => {
      const categories: TenantRecord[] = [
        { id: 'cat-A1', familyAccountId: FAM_A, name: 'Energia' },
        { id: 'cat-B1', familyAccountId: FAM_B, name: 'Segredo' },
      ];
      const prisma = {
        category: {
          findMany: jest.fn(
            async (args: { where?: Record<string, unknown> }) =>
              applyTenantFilter(categories, args?.where),
          ),
        },
      };
      const service = new CategoryService(prisma as unknown as PrismaService);

      // O service recebe SEMPRE o familyAccountId do escopo (FAM_A),
      // independentemente de o usuário ser Admin Global.
      const result = await service.findAll(FAM_A);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('cat-A1');
      expect(result.some((c) => c.familyAccountId === FAM_B)).toBe(false);
    });

    it('ExpenseService.findOne de outro workspace retorna 404 (sem vazamento)', async () => {
      const expenses: TenantRecord[] = [
        {
          id: 'exp-A1',
          familyAccountId: FAM_A,
          type: ExpenseType.SINGLE,
          totalAmount: 5000,
          deletedAt: null,
          statusRecurrence: ExpenseRecurrenceStatus.ACTIVE,
        },
        {
          id: 'exp-B1',
          familyAccountId: FAM_B,
          type: ExpenseType.SINGLE,
          totalAmount: 999999,
          deletedAt: null,
          statusRecurrence: ExpenseRecurrenceStatus.ACTIVE,
        },
      ];
      const prisma = {
        expense: {
          findFirst: jest.fn(
            async (args: { where?: Record<string, unknown> }) =>
              applyTenantFilter(expenses, args?.where)[0] ?? null,
          ),
        },
      };
      const service = new ExpenseService(prisma as unknown as PrismaService);

      await expect(service.findOne(FAM_A, 'exp-B1')).rejects.toMatchObject({
        status: 404,
      });
    });

    it('PaymentItemService.getQueue filtra por expense.familyAccountId', async () => {
      const items = [
        {
          id: 'pi-A1',
          status: PaymentStatus.PENDING,
          dueDate: new Date('2026-09-20T00:00:00.000Z'),
          expense: { id: 'exp-A1', familyAccountId: FAM_A, deletedAt: null },
        },
        {
          id: 'pi-B1',
          status: PaymentStatus.PENDING,
          dueDate: new Date('2026-09-20T00:00:00.000Z'),
          expense: { id: 'exp-B1', familyAccountId: FAM_B, deletedAt: null },
        },
      ];
      const prisma = {
        paymentItem: {
          findMany: jest.fn(
            async (args: { where?: Record<string, unknown> }) => {
              const where = args?.where ?? {};
              const expenseFilter = (where.expense ?? {}) as Record<
                string,
                unknown
              >;
              return items.filter((item) => {
                if (
                  where.status !== undefined &&
                  item.status !== where.status
                ) {
                  return false;
                }
                if (
                  expenseFilter.familyAccountId !== undefined &&
                  item.expense.familyAccountId !==
                    expenseFilter.familyAccountId
                ) {
                  return false;
                }
                return true;
              });
            },
          ),
        },
      };
      const service = new PaymentItemService(
        prisma as unknown as PrismaService,
      );

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

  // ─────────────────────────────────────────────────────────────
  // 3. AdminService cross-tenant só é alcançável por rota protegida
  // ─────────────────────────────────────────────────────────────
  describe('AdminService cross-tenant protegido pelo GlobalAdminGuard', () => {
    it('Role.ADMIN (chefe de família) é bloqueado (403) no Painel Aksurim', () => {
      const guard = new GlobalAdminGuard(createAdminRouteReflector(true));
      expect(() =>
        guard.canActivate(
          createContext({ user: makeUser({ role: Role.ADMIN }) }),
        ),
      ).toThrow(ForbiddenException);
    });

    it('MEMBER comum é bloqueado (403) no Painel Aksurim', () => {
      const guard = new GlobalAdminGuard(createAdminRouteReflector(true));
      expect(() =>
        guard.canActivate(createContext({ user: makeUser() })),
      ).toThrow(ForbiddenException);
    });

    it('Admin Global é liberado no Painel Aksurim', () => {
      const guard = new GlobalAdminGuard(createAdminRouteReflector(true));
      expect(
        guard.canActivate(
          createContext({ user: makeUser({ isGlobalAdmin: true }) }),
        ),
      ).toBe(true);
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
                  role: Role.ADMIN,
                  isEmailVerified: true,
                  createdAt: new Date('2026-01-01T00:00:00.000Z'),
                },
              ],
            },
          ]),
        },
      };
      const service = new AdminService(prisma as unknown as PrismaService);

      const leads = await service.getLeads();

      expect(leads).toHaveLength(1);
      expect(leads[0].ownerCpfMasked).toBe('***.***.111-11');
      expect(JSON.stringify(leads)).not.toContain('111.111.111-11');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. familyAccountId nunca é aceito do cliente
  // ─────────────────────────────────────────────────────────────
  describe('familyAccountId nunca é parametrizável pelo cliente', () => {
    it('bloqueia (400) familyAccountId via query em rota comum', () => {
      const request: MockRequest = {
        user: makeUser(),
        query: { familyAccountId: FAM_B },
      };
      const interceptor = new FamilyScopeInterceptor(
        createReflector({ isGlobalAdminRoute: false }),
      );

      expect(() =>
        interceptor.intercept(createContext(request), next),
      ).toThrow();
      expect(request[FAMILY_SCOPE_KEY]).toBeUndefined();
    });

    it('bloqueia (400) familyAccountId via body mesmo em rota Admin Global', () => {
      const request: MockRequest = {
        user: makeUser({ isGlobalAdmin: true }),
        body: { familyAccountId: FAM_B },
      };
      const interceptor = new FamilyScopeInterceptor(
        createReflector({ isGlobalAdminRoute: true }),
      );

      expect(() =>
        interceptor.intercept(createContext(request), next),
      ).toThrow();
      expect(request[FAMILY_SCOPE_KEY]).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. Invariante do mock tenant-aware
  // ─────────────────────────────────────────────────────────────
  describe('Invariante do mock tenant-aware', () => {
    it('query sem escopo vaza (prova que o mock detecta regressões)', () => {
      const records: TenantRecord[] = [
        { id: 'x-A', familyAccountId: FAM_A },
        { id: 'x-B', familyAccountId: FAM_B },
      ];

      expect(applyTenantFilter(records, undefined)).toHaveLength(2);
      expect(
        applyTenantFilter(records, { familyAccountId: FAM_A }),
      ).toHaveLength(1);
    });
  });
});
