import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { PaymentItemService } from './payment-item.service';

/**
 * Testes unitários do PaymentItemService (TAREFA 13 + v1.2.8 Quitação Parcial/Adicional).
 */
describe('PaymentItemService — fila e quitação inteligente', () => {
  let service: PaymentItemService;
  let prisma: {
    paymentItem: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
    expense: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      paymentItem: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      expense: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((arg: unknown) => {
        if (typeof arg === 'function') {
          return (arg as (tx: typeof prisma) => unknown)(prisma);
        }
        return Promise.all(arg as Promise<unknown>[]);
      }),
    };

    service = new PaymentItemService(prisma as unknown as PrismaService);
  });

  function makeItem(
    overrides: Partial<{
      id: string;
      dueDate: Date;
      expectedAmount: number;
      paidAmount: number | null;
      status: PaymentStatus;
      notes: string | null;
      paidBy: { initials: string; avatarColor: string } | null;
    }> = {},
  ): Record<string, unknown> {
    return {
      id: overrides.id ?? 'item-1',
      expenseId: 'exp-1',
      dueDate: overrides.dueDate ?? new Date(Date.UTC(2026, 8, 20)),
      installmentNumber: 1,
      totalInstallments: 1,
      expectedAmount: overrides.expectedAmount ?? 15075,
      paidAmount: overrides.paidAmount ?? null,
      paidAt: null,
      paidById: null,
      status: overrides.status ?? PaymentStatus.PENDING,
      notes: overrides.notes ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      expense: { id: 'exp-1', title: 'Conta de luz', categoryId: 'cat-1', deletedAt: null },
      paidBy: overrides.paidBy ?? null,
    };
  }

  function daysFromToday(days: number): Date {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days),
    );
  }

  describe('getQueue — badge do pagador sem N+1', () => {
    it('inclui paidBy { initials, avatarColor } na MESMA query (join único)', async () => {
      prisma.paymentItem.findMany.mockResolvedValue([]);

      await service.getQueue('fam-1', {});

      expect(prisma.paymentItem.findMany).toHaveBeenCalledTimes(1);
      const arg = prisma.paymentItem.findMany.mock.calls[0][0];
      expect(arg.include).toMatchObject({
        paidBy: { select: { initials: true, avatarColor: true } },
      });
    });

    it('filtra por familyAccountId e exclui despesas soft-deleted (RN-01 / §8.3)', async () => {
      prisma.paymentItem.findMany.mockResolvedValue([]);

      await service.getQueue('fam-1', {});

      const arg = prisma.paymentItem.findMany.mock.calls[0][0];
      expect(arg.where).toMatchObject({
        status: PaymentStatus.PENDING,
        expense: { familyAccountId: 'fam-1', deletedAt: null },
      });
    });

    it('executa apenas UMA query para toda a fila (sem N+1)', async () => {
      prisma.paymentItem.findMany.mockResolvedValue([
        makeItem({ id: 'a' }),
        makeItem({ id: 'b' }),
        makeItem({ id: 'c' }),
      ]);

      await service.getQueue('fam-1', {});

      expect(prisma.paymentItem.findMany).toHaveBeenCalledTimes(1);
    });

    it('preserva o badge do pagador hidratado nos itens retornados', async () => {
      const payer = { initials: 'MS', avatarColor: '#06777F' };
      prisma.paymentItem.findMany.mockResolvedValue([
        makeItem({ id: 'paid-1', paidBy: payer }),
      ]);

      const queue = await service.getQueue('fam-1', {});

      const all = [
        ...queue.overdue,
        ...queue.currentMonth,
        ...queue.upcoming,
      ];
      expect(all[0].paidBy).toEqual(payer);
    });

    it('ordena por urgência: atraso → mês atual → futuros (RN-06 / §8.5)', async () => {
      const overdueDate = daysFromToday(-10);
      const currentDate = daysFromToday(1);
      const upcomingDate = daysFromToday(60);

      prisma.paymentItem.findMany.mockResolvedValue([
        makeItem({ id: 'overdue', dueDate: overdueDate }),
        makeItem({ id: 'current', dueDate: currentDate }),
        makeItem({ id: 'upcoming', dueDate: upcomingDate }),
      ]);

      const queue = await service.getQueue('fam-1', {});

      expect(queue.overdue.map((i) => i.id)).toEqual(['overdue']);
      expect(queue.currentMonth.map((i) => i.id)).toEqual(['current']);
      expect(queue.upcoming.map((i) => i.id)).toEqual(['upcoming']);
    });
  });

  describe('pay — quitação exata, parcial, desconto, juros e reajuste', () => {
    it('retorna o item quitado com paidBy hidratado (join único)', async () => {
      prisma.paymentItem.findFirst.mockResolvedValue(
        makeItem({ status: PaymentStatus.PENDING }),
      );
      const payer = { initials: 'JL', avatarColor: '#FB4629' };
      prisma.paymentItem.update.mockResolvedValue(
        makeItem({ status: PaymentStatus.PAID, paidBy: payer }),
      );

      const result = await service.pay('fam-1', 'item-1', 'user-1', {
        paidAmount: 15075,
        paidAt: '2026-09-20T12:00:00.000Z',
      });

      expect(result.paidBy).toEqual(payer);
      const arg = prisma.paymentItem.update.mock.calls[0][0];
      expect(arg.include).toMatchObject({
        paidBy: { select: { initials: true, avatarColor: true } },
      });
    });

    it('cria novo item PENDING com o saldo restante quando pagamento é PARTIAL', async () => {
      prisma.paymentItem.findFirst.mockResolvedValue(
        makeItem({ expectedAmount: 100000, status: PaymentStatus.PENDING }),
      );
      prisma.paymentItem.update.mockResolvedValue(
        makeItem({
          expectedAmount: 50000,
          paidAmount: 50000,
          status: PaymentStatus.PAID,
        }),
      );
      prisma.paymentItem.create.mockResolvedValue(
        makeItem({
          id: 'item-remaining',
          expectedAmount: 50000,
          status: PaymentStatus.PENDING,
        }),
      );

      await service.pay('fam-1', 'item-1', 'user-1', {
        paidAmount: 50000,
        paidAt: '2026-09-20T12:00:00.000Z',
        differenceHandling: 'PARTIAL',
      });

      expect(prisma.paymentItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'item-1' },
          data: expect.objectContaining({
            status: PaymentStatus.PAID,
            expectedAmount: 50000,
            paidAmount: 50000,
          }),
        }),
      );
      expect(prisma.paymentItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expenseId: 'exp-1',
            expectedAmount: 50000,
            status: PaymentStatus.PENDING,
          }),
        }),
      );
    });

    it('quita integralmente sem gerar saldo restante quando differenceHandling é DISCOUNT', async () => {
      prisma.paymentItem.findFirst.mockResolvedValue(
        makeItem({ expectedAmount: 100000, status: PaymentStatus.PENDING }),
      );
      prisma.paymentItem.update.mockResolvedValue(
        makeItem({
          expectedAmount: 100000,
          paidAmount: 80000,
          status: PaymentStatus.PAID,
        }),
      );

      await service.pay('fam-1', 'item-1', 'user-1', {
        paidAmount: 80000,
        paidAt: '2026-09-20T12:00:00.000Z',
        differenceHandling: 'DISCOUNT',
      });

      expect(prisma.paymentItem.create).not.toHaveBeenCalled();
      expect(prisma.paymentItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: PaymentStatus.PAID,
            paidAmount: 80000,
            notes: expect.stringContaining('[Desconto:'),
          }),
        }),
      );
    });

    it('atualiza parcelas futuras quando differenceHandling é READJUSTMENT', async () => {
      prisma.paymentItem.findFirst.mockResolvedValue(
        makeItem({ expectedAmount: 50000, status: PaymentStatus.PENDING }),
      );
      prisma.paymentItem.update.mockResolvedValue(
        makeItem({
          expectedAmount: 55000,
          paidAmount: 55000,
          status: PaymentStatus.PAID,
        }),
      );
      prisma.expense.findUnique.mockResolvedValue({ type: 'RECURRENT' });

      await service.pay('fam-1', 'item-1', 'user-1', {
        paidAmount: 55000,
        paidAt: '2026-09-20T12:00:00.000Z',
        differenceHandling: 'READJUSTMENT',
      });

      expect(prisma.paymentItem.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { expectedAmount: 55000 },
        }),
      );
      expect(prisma.expense.update).toHaveBeenCalledWith({
        where: { id: 'exp-1' },
        data: { totalAmount: 55000 },
      });
    });

    it('rejeita quitação de item já pago (400)', async () => {
      prisma.paymentItem.findFirst.mockResolvedValue(
        makeItem({ status: PaymentStatus.PAID }),
      );

      await expect(
        service.pay('fam-1', 'item-1', 'user-1', {
          paidAmount: 15075,
          paidAt: '2026-09-20T12:00:00.000Z',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('retorna 404 ao quitar item de outro workspace (RN-01 / §8.3)', async () => {
      prisma.paymentItem.findFirst.mockResolvedValue(null);

      await expect(
        service.pay('fam-1', 'item-alheio', 'user-1', {
          paidAmount: 15075,
          paidAt: '2026-09-20T12:00:00.000Z',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
