import { BadRequestException } from '@nestjs/common';
import { ExpenseType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { ExpenseService } from './expense.service';

/**
 * Testes unitários do motor de geração de PaymentItems (TAREFA 50 — smoke).
 *
 * Foco em aritmética inteira (RN-04 / §8.2) e regras de tipo (RN-05 / §8.4).
 * O PrismaService é mockado — nenhuma conexão real de banco é necessária.
 */
describe('ExpenseService — geração de PaymentItems', () => {
  let service: ExpenseService;
  let prisma: {
    $transaction: jest.Mock;
    expense: { create: jest.Mock; findMany: jest.Mock };
    paymentItem: { createMany: jest.Mock; findMany: jest.Mock };
    category: { findFirst: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      expense: { create: jest.fn(), findMany: jest.fn() },
      paymentItem: { createMany: jest.fn(), findMany: jest.fn() },
      category: { findFirst: jest.fn() },
    };

    service = new ExpenseService(prisma as unknown as PrismaService);
  });

  /**
   * Executa o callback de transação com o próprio mock como client `tx`.
   */
  function mockTransaction(): void {
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => Promise<unknown>) =>
        callback(prisma),
    );
  }

  it('gera exatamente 1 PaymentItem para despesa SINGLE', async () => {
    mockTransaction();
    prisma.category.findFirst.mockResolvedValue({ id: 'cat-1' });
    prisma.expense.create.mockResolvedValue({
      id: 'exp-1',
      type: ExpenseType.SINGLE,
      totalAmount: 15075,
    });
    prisma.paymentItem.createMany.mockResolvedValue({ count: 1 });
    prisma.paymentItem.findMany.mockResolvedValue([]);

    await service.create('fam-1', 'user-1', {
      title: 'Conta de luz',
      type: ExpenseType.SINGLE,
      totalAmount: 15075,
      categoryId: 'cat-1',
      dueDate: '2026-09-20T00:00:00.000Z',
    });

    const createManyArg = prisma.paymentItem.createMany.mock.calls[0][0];
    expect(createManyArg.data).toHaveLength(1);
    expect(createManyArg.data[0]).toMatchObject({
      installmentNumber: 1,
      totalInstallments: 1,
      expectedAmount: 15075,
      status: 'PENDING',
    });
  });

  it('distribui parcelas com aritmética inteira e resíduo na última (INSTALLMENT)', async () => {
    mockTransaction();
    prisma.category.findFirst.mockResolvedValue({ id: 'cat-1' });
    prisma.expense.create.mockResolvedValue({
      id: 'exp-2',
      type: ExpenseType.INSTALLMENT,
      totalAmount: 10000,
    });
    prisma.paymentItem.createMany.mockResolvedValue({ count: 3 });
    prisma.paymentItem.findMany.mockResolvedValue([]);

    await service.create('fam-1', 'user-1', {
      title: 'Notebook',
      type: ExpenseType.INSTALLMENT,
      totalAmount: 10000,
      categoryId: 'cat-1',
      dueDate: '2026-09-20T00:00:00.000Z',
      totalInstallments: 3,
    });

    const items = prisma.paymentItem.createMany.mock.calls[0][0].data;
    expect(items).toHaveLength(3);

    const sum = items.reduce(
      (acc: number, item: { expectedAmount: number }) =>
        acc + item.expectedAmount,
      0,
    );
    // A soma das parcelas deve ser EXATAMENTE o total (sem ponto flutuante).
    expect(sum).toBe(10000);
    expect(items[0].expectedAmount).toBe(3333);
    expect(items[1].expectedAmount).toBe(3333);
    expect(items[2].expectedAmount).toBe(3334);
  });

  it('rejeita INSTALLMENT com menos de 2 parcelas', async () => {
    mockTransaction();
    prisma.category.findFirst.mockResolvedValue({ id: 'cat-1' });
    prisma.expense.create.mockResolvedValue({
      id: 'exp-3',
      type: ExpenseType.INSTALLMENT,
      totalAmount: 5000,
    });

    await expect(
      service.create('fam-1', 'user-1', {
        title: 'Inválida',
        type: ExpenseType.INSTALLMENT,
        totalAmount: 5000,
        categoryId: 'cat-1',
        dueDate: '2026-09-20T00:00:00.000Z',
        totalInstallments: 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('gera projeção mensal com totalInstallments=0 para RECURRENT', async () => {
    mockTransaction();
    prisma.category.findFirst.mockResolvedValue({ id: 'cat-1' });
    prisma.expense.create.mockResolvedValue({
      id: 'exp-4',
      type: ExpenseType.RECURRENT,
      totalAmount: 8990,
    });
    prisma.paymentItem.createMany.mockResolvedValue({ count: 12 });
    prisma.paymentItem.findMany.mockResolvedValue([]);

    await service.create('fam-1', 'user-1', {
      title: 'Internet',
      type: ExpenseType.RECURRENT,
      totalAmount: 8990,
      categoryId: 'cat-1',
      dueDate: '2026-09-05T00:00:00.000Z',
    });

    const items = prisma.paymentItem.createMany.mock.calls[0][0].data;
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items[0]).toMatchObject({
      installmentNumber: 1,
      totalInstallments: 0,
      expectedAmount: 8990,
    });
  });
});
