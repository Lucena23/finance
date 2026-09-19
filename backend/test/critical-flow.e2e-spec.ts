/**
 * critical-flow.e2e-spec.ts — Teste e2e do fluxo crítico (TAREFA 54).
 *
 * Cobre o caminho ponta-a-ponta mais importante do produto:
 *   cadastro → login → criar despesa → quitar parcela → verificar histórico.
 *
 * Estratégia de isolamento:
 *  - A aplicação NestJS COMPLETA é inicializada (guards globais, interceptor de
 *    escopo multi-tenant, ValidationPipe, controllers e services reais).
 *  - O PrismaService é substituído por um mock IN-MEMORY que simula o MySQL,
 *    respeitando os filtros `where` (inclusive `familyAccountId`) de forma
 *    tenant-aware. Assim, o fluxo HTTP real é exercitado sem depender de um
 *    banco externo — ambiente de teste isolado e determinístico.
 *
 * REGRAS cobertas:
 *  - RN-01 / §8.3: isolamento multi-tenant (escopo derivado do JWT).
 *  - RN-04 / §8.2: valores monetários em centavos (Int).
 *  - RN-05 / §8.4: geração de PaymentItems por tipo.
 *  - RN-07: quitação com rastreabilidade (paidById).
 *  - RN-08 / §8.8: histórico com badge do pagador (initials + avatarColor).
 */

import { randomUUID } from 'node:crypto';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// ═══════════════════════════════════════════
// MOCK IN-MEMORY DO PRISMA (simula o MySQL)
// ═══════════════════════════════════════════

interface Row {
  id: string;
  [key: string]: unknown;
}

/**
 * Gera um identificador UUID v4 válido — os DTOs validam `categoryId`/`id`
 * como UUID v4, então o mock precisa produzir IDs no mesmo formato do Prisma.
 */
function nextId(): string {
  return randomUUID();
}

/**
 * Aplica um `where` simples sobre um conjunto de linhas, respeitando os
 * operadores usados pelo fluxo (igualdade, `null`, `{ not: null }`, `{ gt }`,
 * `{ gte, lt }` e filtros aninhados de relação via `expense`).
 */
function matches(row: Row, where: Record<string, unknown> | undefined): boolean {
  if (!where) {
    return true;
  }

  for (const [key, value] of Object.entries(where)) {
    if (key === 'expense') {
      // Filtro de relação: resolvido pelo chamador (não aqui).
      continue;
    }

    const rowValue = row[key];

    if (value === null) {
      if (rowValue !== null && rowValue !== undefined) {
        return false;
      }
      continue;
    }

    if (typeof value === 'object' && value !== null) {
      const op = value as Record<string, unknown>;

      if ('not' in op && op.not === null) {
        if (rowValue === null || rowValue === undefined) {
          return false;
        }
        continue;
      }

      if ('gt' in op) {
        if (!(rowValue instanceof Date) || !(op.gt instanceof Date)) {
          return false;
        }
        if (!(rowValue.getTime() > op.gt.getTime())) {
          return false;
        }
        continue;
      }

      if ('gte' in op) {
        if (!(rowValue instanceof Date) || !(op.gte instanceof Date)) {
          return false;
        }
        if (!(rowValue.getTime() >= op.gte.getTime())) {
          return false;
        }
        continue;
      }

      if ('lt' in op) {
        if (!(rowValue instanceof Date) || !(op.lt instanceof Date)) {
          return false;
        }
        if (!(rowValue.getTime() < op.lt.getTime())) {
          return false;
        }
        continue;
      }
    }

    if (rowValue !== value) {
      return false;
    }
  }

  return true;
}

/**
 * Mock in-memory do PrismaService — cobre apenas as operações usadas pelo
 * fluxo crítico. Simula o comportamento tenant-aware do MySQL.
 *
 * Expõe os delegates com os MESMOS nomes do Prisma Client (`familyAccount`,
 * `user`, `category`, `expense`, `paymentItem`, `pushSubscription`) para que
 * tanto o uso direto (`prisma.expense`) quanto o uso transacional
 * (`tx.expense`) funcionem sem adaptação.
 */
class InMemoryPrisma {
  public familyAccountRows: Row[] = [];
  public userRows: Row[] = [];
  public categoryRows: Row[] = [];
  public expenseRows: Row[] = [];
  public paymentItemRows: Row[] = [];
  public pushSubscriptionRows: Row[] = [];

  private rows(tableName: string): Row[] {
    return (this as unknown as Record<string, Row[]>)[`${tableName}Rows`];
  }

  private findMany(
    tableName: string,
    args?: { where?: Record<string, unknown> },
  ): Row[] {
    const rows = this.rows(tableName);
    const where = args?.where;

    return rows.filter((row) => {
      if (!matches(row, where)) {
        return false;
      }

      // Filtro de relação `expense` (usado por paymentItem).
      const expenseFilter = where?.expense as
        | Record<string, unknown>
        | undefined;
      if (expenseFilter) {
        const expense = this.expenseRows.find((e) => e.id === row.expenseId);
        if (!expense) {
          return false;
        }
        if (!matches(expense, expenseFilter)) {
          return false;
        }
      }

      return true;
    });
  }

  private findFirst(
    tableName: string,
    args?: { where?: Record<string, unknown> },
  ): Row | null {
    return this.findMany(tableName, args)[0] ?? null;
  }

  // ── familyAccount ──
  familyAccount = {
    findUnique: async (args: {
      where: { id?: string; ownerCpf?: string };
    }): Promise<Row | null> => {
      const { id, ownerCpf } = args.where;
      return (
        this.familyAccountRows.find(
          (f) =>
            (id !== undefined && f.id === id) ||
            (ownerCpf !== undefined && f.ownerCpf === ownerCpf),
        ) ?? null
      );
    },
    create: async (args: { data: Record<string, unknown> }): Promise<Row> => {
      const row: Row = {
        id: nextId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...args.data,
      };
      this.familyAccountRows.push(row);
      return row;
    },
  };

  // ── user ──
  user = {
    findUnique: async (args: {
      where: { id?: string; email?: string };
    }): Promise<Row | null> => {
      const { id, email } = args.where;
      return (
        this.userRows.find(
          (u) =>
            (id !== undefined && u.id === id) ||
            (email !== undefined && u.email === email),
        ) ?? null
      );
    },
    findFirst: async (args: {
      where?: Record<string, unknown>;
    }): Promise<Row | null> => this.findFirst('user', args),
    create: async (args: { data: Record<string, unknown> }): Promise<Row> => {
      const row: Row = {
        id: nextId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...args.data,
      };
      this.userRows.push(row);
      return row;
    },
  };

  // ── category ──
  category = {
    findMany: async (args?: {
      where?: Record<string, unknown>;
    }): Promise<Row[]> => this.findMany('category', args),
    findFirst: async (args?: {
      where?: Record<string, unknown>;
    }): Promise<Row | null> => this.findFirst('category', args),
    create: async (args: { data: Record<string, unknown> }): Promise<Row> => {
      const row: Row = {
        id: nextId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...args.data,
      };
      this.categoryRows.push(row);
      return row;
    },
    update: async (args: {
      where: { id: string };
      data: Record<string, unknown>;
    }): Promise<Row> => {
      const row = this.categoryRows.find((c) => c.id === args.where.id);
      if (!row) {
        throw new Error('category not found');
      }
      Object.assign(row, args.data, { updatedAt: new Date() });
      return row;
    },
    delete: async (args: { where: { id: string } }): Promise<Row> => {
      const idx = this.categoryRows.findIndex((c) => c.id === args.where.id);
      const [row] = this.categoryRows.splice(idx, 1);
      return row;
    },
  };

  // ── expense ──
  expense = {
    findMany: async (args?: {
      where?: Record<string, unknown>;
    }): Promise<Row[]> => this.findMany('expense', args),
    findFirst: async (args?: {
      where?: Record<string, unknown>;
    }): Promise<Row | null> => this.findFirst('expense', args),
    count: async (args?: { where?: Record<string, unknown> }): Promise<number> =>
      this.findMany('expense', args).length,
    create: async (args: { data: Record<string, unknown> }): Promise<Row> => {
      const row: Row = {
        id: nextId(),
        statusRecurrence: 'ACTIVE',
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...args.data,
      };
      this.expenseRows.push(row);
      return row;
    },
    update: async (args: {
      where: { id: string };
      data: Record<string, unknown>;
    }): Promise<Row> => {
      const row = this.expenseRows.find((e) => e.id === args.where.id);
      if (!row) {
        throw new Error('expense not found');
      }
      Object.assign(row, args.data, { updatedAt: new Date() });
      return row;
    },
  };

  // ── paymentItem ──
  paymentItem = {
    findMany: async (args?: {
      where?: Record<string, unknown>;
      orderBy?: Record<string, 'asc' | 'desc'>;
      skip?: number;
      take?: number;
      include?: Record<string, unknown>;
    }): Promise<Row[]> => {
      let rows = this.findMany('paymentItem', args);

      const orderBy = args?.orderBy;
      if (orderBy) {
        const [field, dir] = Object.entries(orderBy)[0];
        rows = [...rows].sort((a, b) => {
          const av = a[field];
          const bv = b[field];
          const cmp =
            av instanceof Date && bv instanceof Date
              ? av.getTime() - bv.getTime()
              : String(av).localeCompare(String(bv));
          return dir === 'desc' ? -cmp : cmp;
        });
      }

      if (args?.skip !== undefined) {
        rows = rows.slice(args.skip);
      }
      if (args?.take !== undefined) {
        rows = rows.slice(0, args.take);
      }

      // `include: { paidBy: ... }` → anexa o pagador.
      if (args?.include && 'paidBy' in args.include) {
        rows = rows.map((row) => {
          const payer = this.userRows.find((u) => u.id === row.paidById);
          return {
            ...row,
            paidBy: payer
              ? { initials: payer.initials, avatarColor: payer.avatarColor }
              : null,
          };
        });
      }

      return rows;
    },
    findFirst: async (args?: {
      where?: Record<string, unknown>;
    }): Promise<Row | null> => this.findFirst('paymentItem', args),
    count: async (args?: { where?: Record<string, unknown> }): Promise<number> =>
      this.findMany('paymentItem', args).length,
    createMany: async (args: {
      data: Record<string, unknown>[];
    }): Promise<{ count: number }> => {
      for (const data of args.data) {
        this.paymentItemRows.push({
          id: nextId(),
          paidAmount: null,
          paidAt: null,
          paidById: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        });
      }
      return { count: args.data.length };
    },
    update: async (args: {
      where: { id: string };
      data: Record<string, unknown>;
    }): Promise<Row> => {
      const row = this.paymentItemRows.find((p) => p.id === args.where.id);
      if (!row) {
        throw new Error('paymentItem not found');
      }
      Object.assign(row, args.data, { updatedAt: new Date() });
      return row;
    },
    updateMany: async (args: {
      where?: Record<string, unknown>;
      data: Record<string, unknown>;
    }): Promise<{ count: number }> => {
      const rows = this.findMany('paymentItem', args);
      for (const row of rows) {
        Object.assign(row, args.data, { updatedAt: new Date() });
      }
      return { count: rows.length };
    },
    deleteMany: async (args?: {
      where?: Record<string, unknown>;
    }): Promise<{ count: number }> => {
      const rows = this.findMany('paymentItem', args);
      const ids = new Set(rows.map((r) => r.id));
      const before = this.paymentItemRows.length;
      this.paymentItemRows = this.paymentItemRows.filter(
        (p) => !ids.has(p.id),
      );
      return { count: before - this.paymentItemRows.length };
    },
  };

  // ── pushSubscription ──
  pushSubscription = {
    findFirst: async (args?: {
      where?: Record<string, unknown>;
    }): Promise<Row | null> => this.findFirst('pushSubscription', args),
    create: async (args: { data: Record<string, unknown> }): Promise<Row> => {
      const row: Row = {
        id: nextId(),
        createdAt: new Date(),
        ...args.data,
      };
      this.pushSubscriptionRows.push(row);
      return row;
    },
    update: async (args: {
      where: { id: string };
      data: Record<string, unknown>;
    }): Promise<Row> => {
      const row = this.pushSubscriptionRows.find((s) => s.id === args.where.id);
      if (!row) {
        throw new Error('pushSubscription not found');
      }
      Object.assign(row, args.data);
      return row;
    },
    deleteMany: async (args?: {
      where?: Record<string, unknown>;
    }): Promise<{ count: number }> => {
      const rows = this.findMany('pushSubscription', args);
      const ids = new Set(rows.map((r) => r.id));
      const before = this.pushSubscriptionRows.length;
      this.pushSubscriptionRows = this.pushSubscriptionRows.filter(
        (s) => !ids.has(s.id),
      );
      return { count: before - this.pushSubscriptionRows.length };
    },
  };

  // ── transação ──
  async $transaction<T>(
    arg: ((tx: InMemoryPrisma) => Promise<T>) | Array<Promise<unknown>>,
  ): Promise<T | unknown[]> {
    if (typeof arg === 'function') {
      return arg(this);
    }
    return Promise.all(arg);
  }

  async $connect(): Promise<void> {
    /* no-op */
  }

  async $disconnect(): Promise<void> {
    /* no-op */
  }
}

/**
 * Constrói o objeto PrismaService mockado, expondo os delegates com os nomes
 * usados pelos services (`prisma.familyAccount`, `prisma.user`, etc.).
 */
function createPrismaMock(): PrismaService {
  return new InMemoryPrisma() as unknown as PrismaService;
}

// ═══════════════════════════════════════════
// SUITE E2E
// ═══════════════════════════════════════════

describe('Fluxo crítico e2e (TAREFA 54)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(createPrismaMock())
      .compile();

    app = moduleRef.createNestApplication();

    // Espelha a configuração de bootstrap do main.ts.
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('executa cadastro → login → criar despesa → quitar parcela → histórico', async () => {
    const server = app.getHttpServer();

    // ── 1. Cadastro (cria FamilyAccount + ADMIN) ──
    const registerRes = await request(server)
      .post('/api/v1/auth/register')
      .send({
        name: 'Maria Silva',
        email: 'maria@aksurim.com',
        password: 'senhaSegura123',
        familyName: 'Família Silva',
        ownerCpf: '123.456.789-09',
      })
      .expect(201);

    expect(registerRes.body.accessToken).toBeDefined();
    expect(registerRes.body.user.role).toBe('ADMIN');
    expect(registerRes.body.user.initials).toBe('MS');
    expect(registerRes.body.user.passwordHash).toBeUndefined();

    const token: string = registerRes.body.accessToken;

    // ── 2. Login ──
    const loginRes = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'maria@aksurim.com', password: 'senhaSegura123' })
      .expect(200);

    expect(loginRes.body.accessToken).toBeDefined();
    expect(loginRes.body.user.email).toBe('maria@aksurim.com');

    const auth = { Authorization: `Bearer ${token}` };

    // ── 3. Criar categoria ──
    const categoryRes = await request(server)
      .post('/api/v1/categories')
      .set(auth)
      .send({ name: 'Energia', color: '#F59E0B', icon: 'zap' })
      .expect(201);

    const categoryId: string = categoryRes.body.id;

    // ── 4. Criar despesa parcelada (INSTALLMENT) ──
    const expenseRes = await request(server)
      .post('/api/v1/expenses')
      .set(auth)
      .send({
        title: 'Geladeira',
        type: 'INSTALLMENT',
        totalAmount: 100000, // R$ 1.000,00 em centavos (RN-04)
        categoryId,
        dueDate: '2026-10-10T00:00:00.000Z',
        totalInstallments: 3,
      })
      .expect(201);

    expect(expenseRes.body.paymentItems).toHaveLength(3);

    // Aritmética inteira: 100000 / 3 = 33333 (x2) + 33334 (última) = 100000.
    const amounts = expenseRes.body.paymentItems.map(
      (item: { expectedAmount: number }) => item.expectedAmount,
    );
    expect(amounts).toEqual([33333, 33333, 33334]);
    expect(amounts.reduce((a: number, b: number) => a + b, 0)).toBe(100000);

    const firstItemId: string = expenseRes.body.paymentItems[0].id;

    // ── 5. Fila de pagamentos contém a parcela pendente ──
    const queueRes = await request(server)
      .get('/api/v1/payment-items/queue')
      .set(auth)
      .expect(200);

    const queueItems = [
      ...queueRes.body.overdue,
      ...queueRes.body.currentMonth,
      ...queueRes.body.upcoming,
    ];
    expect(queueItems.some((i: { id: string }) => i.id === firstItemId)).toBe(
      true,
    );

    // ── 6. Quitar a primeira parcela (RN-07) ──
    const payRes = await request(server)
      .patch(`/api/v1/payment-items/${firstItemId}/pay`)
      .set(auth)
      .send({
        paidAmount: 33333,
        paidAt: '2026-10-10T12:00:00.000Z',
        notes: 'Pago via PIX',
      })
      .expect(200);

    expect(payRes.body.status).toBe('PAID');
    expect(payRes.body.paidAmount).toBe(33333);
    expect(payRes.body.paidById).toBeDefined();
    expect(payRes.body.notes).toBe('Pago via PIX');

    // ── 7. Item quitado NÃO aparece mais na fila ──
    const queueAfterRes = await request(server)
      .get('/api/v1/payment-items/queue')
      .set(auth)
      .expect(200);

    const queueAfter = [
      ...queueAfterRes.body.overdue,
      ...queueAfterRes.body.currentMonth,
      ...queueAfterRes.body.upcoming,
    ];
    expect(queueAfter.some((i: { id: string }) => i.id === firstItemId)).toBe(
      false,
    );

    // ── 8. Histórico exibe o item com badge do pagador (RN-08) ──
    const historyRes = await request(server)
      .get('/api/v1/payment-items/history')
      .set(auth)
      .expect(200);

    expect(historyRes.body.total).toBe(1);
    expect(historyRes.body.data).toHaveLength(1);
    expect(historyRes.body.data[0].id).toBe(firstItemId);
    expect(historyRes.body.data[0].paidBy).toEqual({
      initials: 'MS',
      avatarColor: expect.any(String),
    });
  });

  it('rejeita quitação de item já pago (400) — RN-07', async () => {
    const server = app.getHttpServer();

    const registerRes = await request(server)
      .post('/api/v1/auth/register')
      .send({
        name: 'João Souza',
        email: 'joao@aksurim.com',
        password: 'senhaSegura123',
        familyName: 'Família Souza',
        ownerCpf: '987.654.321-00',
      })
      .expect(201);

    const auth = { Authorization: `Bearer ${registerRes.body.accessToken}` };

    const categoryRes = await request(server)
      .post('/api/v1/categories')
      .set(auth)
      .send({ name: 'Internet', color: '#3B82F6', icon: 'wifi' })
      .expect(201);

    const expenseRes = await request(server)
      .post('/api/v1/expenses')
      .set(auth)
      .send({
        title: 'Plano de Internet',
        type: 'SINGLE',
        totalAmount: 9990,
        categoryId: categoryRes.body.id,
        dueDate: '2026-10-15T00:00:00.000Z',
      })
      .expect(201);

    const itemId: string = expenseRes.body.paymentItems[0].id;

    await request(server)
      .patch(`/api/v1/payment-items/${itemId}/pay`)
      .set(auth)
      .send({ paidAmount: 9990, paidAt: '2026-10-15T12:00:00.000Z' })
      .expect(200);

    // Segunda tentativa → 400 (transição irreversível).
    await request(server)
      .patch(`/api/v1/payment-items/${itemId}/pay`)
      .set(auth)
      .send({ paidAmount: 9990, paidAt: '2026-10-15T12:00:00.000Z' })
      .expect(400);
  });

  it('isola workspaces: item de outro tenant retorna 404 (RN-01 / §8.3)', async () => {
    const server = app.getHttpServer();

    // Workspace A cria uma despesa.
    const regA = await request(server)
      .post('/api/v1/auth/register')
      .send({
        name: 'Ana Lima',
        email: 'ana@aksurim.com',
        password: 'senhaSegura123',
        familyName: 'Família Lima',
        ownerCpf: '111.222.333-44',
      })
      .expect(201);

    const authA = { Authorization: `Bearer ${regA.body.accessToken}` };

    const catA = await request(server)
      .post('/api/v1/categories')
      .set(authA)
      .send({ name: 'Água', color: '#06B6D4', icon: 'droplet' })
      .expect(201);

    const expA = await request(server)
      .post('/api/v1/expenses')
      .set(authA)
      .send({
        title: 'Conta de Água',
        type: 'SINGLE',
        totalAmount: 5000,
        categoryId: catA.body.id,
        dueDate: '2026-10-20T00:00:00.000Z',
      })
      .expect(201);

    const itemAId: string = expA.body.paymentItems[0].id;

    // Workspace B tenta quitar o item de A → 404 (nunca vaza dados alheios).
    const regB = await request(server)
      .post('/api/v1/auth/register')
      .send({
        name: 'Bruno Costa',
        email: 'bruno@aksurim.com',
        password: 'senhaSegura123',
        familyName: 'Família Costa',
        ownerCpf: '555.666.777-88',
      })
      .expect(201);

    const authB = { Authorization: `Bearer ${regB.body.accessToken}` };

    await request(server)
      .patch(`/api/v1/payment-items/${itemAId}/pay`)
      .set(authB)
      .send({ paidAmount: 5000, paidAt: '2026-10-20T12:00:00.000Z' })
      .expect(404);

    // A fila de B não contém o item de A.
    const queueB = await request(server)
      .get('/api/v1/payment-items/queue')
      .set(authB)
      .expect(200);

    const allB = [
      ...queueB.body.overdue,
      ...queueB.body.currentMonth,
      ...queueB.body.upcoming,
    ];
    expect(allB.some((i: { id: string }) => i.id === itemAId)).toBe(false);
  });

  it('rejeita requisição sem token (401)', async () => {
    const server = app.getHttpServer();

    await request(server).get('/api/v1/payment-items/queue').expect(401);
  });
});
