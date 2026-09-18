import { NotFoundException } from '@nestjs/common';
import {
  ExpenseRecurrenceStatus,
  ExpenseType,
  PaymentStatus,
  Role,
} from '@prisma/client';

import { CategoryService } from '../category/category.service';
import { ExpenseService } from '../expense/expense.service';
import { FamilyAccountService } from '../family-account/family-account.service';
import { NotificationService } from '../notification/notification.service';
import { PaymentItemService } from '../payment-item/payment-item.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Testes de Isolamento Multi-Tenant (TAREFA 53).
 *
 * RN-01 / §8.3 — REGRA INEGOCIÁVEL:
 *  - TODA query de negócio DEVE filtrar por `familyAccountId`.
 *  - O `familyAccountId` é derivado EXCLUSIVAMENTE do JWT (nunca de query/body).
 *  - Acesso cross-workspace retorna 404 ou array vazio — NUNCA dados alheios.
 *
 * Estratégia: o PrismaService é mockado de forma "consciente do tenant". Cada
 * mock simula um banco que SÓ retorna registros cujo `familyAccountId` bate
 * com o filtro recebido. Assim, se um service esquecer o filtro de escopo, o
 * mock devolveria dados de outro workspace e o teste FALHARIA — provando que
 * o isolamento depende do filtro correto em cada query.
 *
 * Workspaces usados:
 *  - fam-A (tenant autenticado / "nós")
 *  - fam-B (tenant alheio / "eles")
 */

const FAM_A = 'fam-A';
const FAM_B = 'fam-B';

/**
 * Registro genérico com vínculo de tenant, usado para simular o banco.
 * `familyAccountId` é opcional pois a própria entidade FamilyAccount não
 * possui esse campo (ela É o tenant).
 */
interface TenantRecord {
  id: string;
  familyAccountId?: string;
  [key: string]: unknown;
}

/**
 * Aplica o filtro `where` de forma tenant-aware sobre um conjunto de registros.
 *
 * Simula o comportamento do MySQL: só retorna linhas cujo `familyAccountId`
 * casa com o filtro. Se o `where` NÃO contiver `familyAccountId`, o mock
 * retorna TODAS as linhas (inclusive de outros tenants) — expondo qualquer
 * query que tenha esquecido o escopo.
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
        // Suporta `deletedAt: null` e `deletedAt: { not: null }`.
        if (value === null && record.deletedAt !== null) {
          return false;
        }
        if (
          typeof value === 'object' &&
          value !== null &&
          'not' in value &&
          (value as { not: unknown }).not === null &&
          record.deletedAt === null
        ) {
          return false;
        }
        continue;
      }

      // Demais campos: comparação direta quando presentes no registro.
      if (key in record && record[key] !== value) {
        return false;
      }
    }

    return true;
  });
}

describe('Isolamento Multi-Tenant (RN-01 / §8.3) — TAREFA 53', () => {
  // ─────────────────────────────────────────────────────────────
  // CATEGORY — CategoryService
  // ─────────────────────────────────────────────────────────────
  describe('CategoryService', () => {
    let service: CategoryService;
    let categories: TenantRecord[];
    let prisma: {
      category: {
        findMany: jest.Mock;
        findFirst: jest.Mock;
        create: jest.Mock;
        update: jest.Mock;
        delete: jest.Mock;
      };
      expense: { count: jest.Mock };
    };

    beforeEach(() => {
      categories = [
        { id: 'cat-A1', familyAccountId: FAM_A, name: 'Energia' },
        { id: 'cat-B1', familyAccountId: FAM_B, name: 'Segredo do vizinho' },
      ];

      prisma = {
        category: {
          findMany: jest.fn(
            async (args: { where?: Record<string, unknown> }) =>
              applyTenantFilter(categories, args?.where),
          ),
          findFirst: jest.fn(
            async (args: { where?: Record<string, unknown> }) =>
              applyTenantFilter(categories, args?.where)[0] ?? null,
          ),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
        expense: { count: jest.fn().mockResolvedValue(0) },
      };

      service = new CategoryService(prisma as unknown as PrismaService);
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
      await expect(
        service.update(FAM_A, 'cat-B1', { name: 'Invadida' }),
      ).rejects.toBeInstanceOf(NotFoundException);

      // A query de escopo foi aplicada com o tenant autenticado.
      const arg = prisma.category.findFirst.mock.calls[0][0];
      expect(arg.where).toMatchObject({ id: 'cat-B1', familyAccountId: FAM_A });
      // Nenhuma escrita foi executada.
      expect(prisma.category.update).not.toHaveBeenCalled();
    });

    it('remove de categoria de OUTRO workspace retorna 404 e não deleta', async () => {
      await expect(service.remove(FAM_A, 'cat-B1')).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prisma.category.delete).not.toHaveBeenCalled();
    });

    it('remove bloqueia (409) quando há despesas vinculadas no workspace', async () => {
      prisma.expense.count.mockResolvedValue(2);

      await expect(service.remove(FAM_A, 'cat-A1')).rejects.toMatchObject({
        status: 409,
      });

      // A contagem de despesas vinculadas também respeita o escopo.
      const arg = prisma.expense.count.mock.calls[0][0];
      expect(arg.where).toMatchObject({
        categoryId: 'cat-A1',
        familyAccountId: FAM_A,
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // EXPENSE — ExpenseService
  // ─────────────────────────────────────────────────────────────
  describe('ExpenseService', () => {
    let service: ExpenseService;
    let expenses: TenantRecord[];
    let prisma: {
      $transaction: jest.Mock;
      expense: {
        findMany: jest.Mock;
        findFirst: jest.Mock;
        create: jest.Mock;
        update: jest.Mock;
        count: jest.Mock;
      };
      paymentItem: {
        createMany: jest.Mock;
        findMany: jest.Mock;
        updateMany: jest.Mock;
        deleteMany: jest.Mock;
      };
      category: { findFirst: jest.Mock };
    };

    beforeEach(() => {
      expenses = [
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

      prisma = {
        $transaction: jest.fn(),
        expense: {
          findMany: jest.fn(
            async (args: { where?: Record<string, unknown> }) =>
              applyTenantFilter(expenses, args?.where),
          ),
          findFirst: jest.fn(
            async (args: { where?: Record<string, unknown> }) =>
              applyTenantFilter(expenses, args?.where)[0] ?? null,
          ),
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

      // Transação: suporta as DUAS formas do Prisma —
      //  (a) callback interativo: $transaction(async (tx) => ...)
      //  (b) batch de promises:    $transaction([promiseA, promiseB])
      prisma.$transaction.mockImplementation(
        async (
          arg:
            | ((tx: typeof prisma) => Promise<unknown>)
            | Array<Promise<unknown>>,
        ) => {
          if (typeof arg === 'function') {
            return arg(prisma);
          }
          return Promise.all(arg);
        },
      );

      service = new ExpenseService(prisma as unknown as PrismaService);
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
      await expect(service.findOne(FAM_A, 'exp-B1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('softDelete de despesa de OUTRO workspace retorna 404 e não altera', async () => {
      await expect(
        service.softDelete(FAM_A, 'exp-B1'),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.expense.update).not.toHaveBeenCalled();
    });

    it('restore de despesa de OUTRO workspace retorna 404', async () => {
      await expect(service.restore(FAM_A, 'exp-B1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('cancelRecurrence de despesa de OUTRO workspace retorna 404', async () => {
      await expect(
        service.cancelRecurrence(FAM_A, 'exp-B1'),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.paymentItem.deleteMany).not.toHaveBeenCalled();
    });

    it('create rejeita categoria pertencente a OUTRO workspace (404)', async () => {
      // A categoria existe, mas pertence a fam-B → o filtro de escopo a esconde.
      prisma.category.findFirst.mockImplementation(
        async (args: { where?: Record<string, unknown> }) => {
          const cats: TenantRecord[] = [
            { id: 'cat-B1', familyAccountId: FAM_B },
          ];
          return applyTenantFilter(cats, args?.where)[0] ?? null;
        },
      );

      await expect(
        service.create(FAM_A, 'user-A', {
          title: 'Despesa órfã',
          type: ExpenseType.SINGLE,
          totalAmount: 1000,
          categoryId: 'cat-B1',
          dueDate: '2026-09-20T00:00:00.000Z',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.expense.create).not.toHaveBeenCalled();
    });

    it('create grava a despesa com o familyAccountId do escopo autenticado', async () => {
      prisma.category.findFirst.mockResolvedValue({ id: 'cat-A1' });
      prisma.expense.create.mockImplementation(
        async (args: { data: Record<string, unknown> }) => ({
          id: 'exp-new',
          ...args.data,
        }),
      );

      await service.create(FAM_A, 'user-A', {
        title: 'Nova',
        type: ExpenseType.SINGLE,
        totalAmount: 1000,
        categoryId: 'cat-A1',
        dueDate: '2026-09-20T00:00:00.000Z',
      });

      const arg = prisma.expense.create.mock.calls[0][0];
      expect(arg.data.familyAccountId).toBe(FAM_A);
      expect(arg.data.createdById).toBe('user-A');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // PAYMENT ITEM — PaymentItemService (fila)
  // ─────────────────────────────────────────────────────────────
  describe('PaymentItemService', () => {
    let service: PaymentItemService;
    let items: Array<TenantRecord & { expense: TenantRecord }>;
    let prisma: {
      paymentItem: { findMany: jest.Mock };
    };

    beforeEach(() => {
      items = [
        {
          id: 'pi-A1',
          familyAccountId: FAM_A,
          status: PaymentStatus.PENDING,
          dueDate: new Date('2026-09-20T00:00:00.000Z'),
          expense: { id: 'exp-A1', familyAccountId: FAM_A, deletedAt: null },
        },
        {
          id: 'pi-B1',
          familyAccountId: FAM_B,
          status: PaymentStatus.PENDING,
          dueDate: new Date('2026-09-20T00:00:00.000Z'),
          expense: { id: 'exp-B1', familyAccountId: FAM_B, deletedAt: null },
        },
      ];

      prisma = {
        paymentItem: {
          findMany: jest.fn(
            async (args: { where?: Record<string, unknown> }) => {
              const where = args?.where ?? {};
              const expenseFilter = (where.expense ?? {}) as Record<
                string,
                unknown
              >;

              return items.filter((item) => {
                // Filtro de status.
                if (
                  where.status !== undefined &&
                  item.status !== where.status
                ) {
                  return false;
                }

                // Filtro de escopo via relação expense.familyAccountId.
                if (
                  expenseFilter.familyAccountId !== undefined &&
                  item.expense.familyAccountId !==
                    expenseFilter.familyAccountId
                ) {
                  return false;
                }

                // Filtro de soft delete da despesa.
                if (
                  expenseFilter.deletedAt === null &&
                  item.expense.deletedAt !== null
                ) {
                  return false;
                }

                return true;
              });
            },
          ),
        },
      };

      service = new PaymentItemService(prisma as unknown as PrismaService);
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
        status: PaymentStatus.PENDING,
        expense: { familyAccountId: FAM_A, deletedAt: null },
      });
    });

    it('getQueue NÃO retorna itens de despesas soft-deleted do próprio workspace', async () => {
      items.push({
        id: 'pi-A2',
        familyAccountId: FAM_A,
        status: PaymentStatus.PENDING,
        dueDate: new Date('2026-09-21T00:00:00.000Z'),
        expense: { id: 'exp-A2', familyAccountId: FAM_A, deletedAt: new Date() },
      });

      const queue = await service.getQueue(FAM_A, {});
      const all = [...queue.overdue, ...queue.currentMonth, ...queue.upcoming];

      expect(all.some((i) => i.id === 'pi-A2')).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // FAMILY ACCOUNT — FamilyAccountService
  // ─────────────────────────────────────────────────────────────
  describe('FamilyAccountService', () => {
    let service: FamilyAccountService;
    let families: TenantRecord[];
    let prisma: {
      familyAccount: {
        findUnique: jest.Mock;
        create: jest.Mock;
        update: jest.Mock;
      };
    };

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
          findUnique: jest.fn(
            async (args: { where: { id?: string; ownerCpf?: string } }) => {
              const { id, ownerCpf } = args.where;
              return (
                families.find(
                  (f) =>
                    (id !== undefined && f.id === id) ||
                    (ownerCpf !== undefined && f.ownerCpf === ownerCpf),
                ) ?? null
              );
            },
          ),
          create: jest.fn(),
          update: jest.fn(),
        },
      };

      service = new FamilyAccountService(prisma as unknown as PrismaService);
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
      await expect(
        service.findCurrent('fam-inexistente'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('update só altera o workspace do escopo autenticado', async () => {
      prisma.familyAccount.update.mockImplementation(
        async (args: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          const target = families.find((f) => f.id === args.where.id);
          return { ...target, ...args.data };
        },
      );

      await service.update(FAM_A, { name: 'Família A Renomeada' });

      const arg = prisma.familyAccount.update.mock.calls[0][0];
      expect(arg.where).toEqual({ id: FAM_A });
      expect(arg.where.id).not.toBe(FAM_B);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // NOTIFICATION — NotificationService (escopo por userId)
  // ─────────────────────────────────────────────────────────────
  describe('NotificationService', () => {
    let service: NotificationService;
    let subscriptions: Array<{
      id: string;
      userId: string;
      endpoint: string;
      p256dh: string;
      auth: string;
    }>;
    let prisma: {
      pushSubscription: {
        findFirst: jest.Mock;
        create: jest.Mock;
        update: jest.Mock;
        deleteMany: jest.Mock;
      };
    };

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
          findFirst: jest.fn(
            async (args: { where: { userId: string; endpoint: string } }) =>
              subscriptions.find(
                (s) =>
                  s.userId === args.where.userId &&
                  s.endpoint === args.where.endpoint,
              ) ?? null,
          ),
          create: jest.fn(),
          update: jest.fn(),
          deleteMany: jest.fn(
            async (args: { where: { userId: string; endpoint: string } }) => {
              const before = subscriptions.length;
              subscriptions = subscriptions.filter(
                (s) =>
                  !(
                    s.userId === args.where.userId &&
                    s.endpoint === args.where.endpoint
                  ),
              );
              return { count: before - subscriptions.length };
            },
          ),
        },
      };

      service = new NotificationService(prisma as unknown as PrismaService);
    });

    it('unsubscribe só remove a subscription do próprio usuário', async () => {
      // user-A tenta remover o endpoint de user-B → nada é removido.
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
      // user-A tenta registrar o MESMO endpoint de user-B.
      prisma.pushSubscription.create.mockImplementation(
        async (args: { data: Record<string, unknown> }) => ({
          id: 'sub-new',
          ...args.data,
        }),
      );

      await service.subscribe('user-A', {
        endpoint: 'https://push.example/B',
        keys: { p256dh: 'novo', auth: 'novo' },
      });

      // Como o findFirst é escopado por userId, user-A não "vê" a sub de
      // user-B → cria uma nova em vez de atualizar a alheia.
      expect(prisma.pushSubscription.update).not.toHaveBeenCalled();
      expect(prisma.pushSubscription.create).toHaveBeenCalledTimes(1);
      const arg = prisma.pushSubscription.create.mock.calls[0][0];
      expect(arg.data.userId).toBe('user-A');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // INVARIANTE GLOBAL — nenhuma query de negócio sem escopo
  // ─────────────────────────────────────────────────────────────
  describe('Invariante global de escopo', () => {
    it('o mock tenant-aware expõe vazamento quando o filtro é omitido', () => {
      const records: TenantRecord[] = [
        { id: 'x-A', familyAccountId: FAM_A },
        { id: 'x-B', familyAccountId: FAM_B },
      ];

      // Sem filtro → vaza (prova que o mock detecta queries sem escopo).
      expect(applyTenantFilter(records, undefined)).toHaveLength(2);

      // Com filtro → isola corretamente.
      expect(
        applyTenantFilter(records, { familyAccountId: FAM_A }),
      ).toHaveLength(1);
      expect(
        applyTenantFilter(records, { familyAccountId: FAM_A })[0].id,
      ).toBe('x-A');
    });

    it('Role enum permanece estável para os testes de autorização', () => {
      expect(Role.ADMIN).toBe('ADMIN');
      expect(Role.MEMBER).toBe('MEMBER');
    });
  });
});
