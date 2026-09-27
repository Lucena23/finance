import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { PaymentItemService } from './payment-item.service';

/**
 * Testes unitários do PaymentItemService (TAREFA 13).
 *
 * Foco:
 *  - Fila de pagamentos com badge do pagador hidratado em UMA ÚNICA query
 *    (sem N+1) — o `include.paidBy` deve estar presente no findMany.
 *  - Ordenação determinística por urgência (RN-06 / §8.5).
 *  - Isolamento multi-tenant (RN-01 / §8.3): filtro por familyAccountId.
 *  - Quitação retornando o `paidBy` hidratado (atualização otimista).
 *
 * O PrismaService é mockado — nenhuma conexão real de banco é necessária.
 */
describe('PaymentItemService — fila com badge do pagador (TAREFA 13)', () => {
  let service: PaymentItemService;
  let prisma: {
    paymentItem: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      paymentItem: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    service = new PaymentItemService(prisma as unknown as PrismaService);
  });

  /**
   * Cria um PaymentItem de teste com o badge do pagador opcional.
   */
  function makeItem(
    overrides: Partial<{
      id: string;
      dueDate: Date;
      status: PaymentStatus;
      paidBy: { initials: string; avatarColor: string } | null;
    }> = {},
  ): Record<string, unknown> {
    return {
      id: overrides.id ?? 'item-1',
      expenseId: 'exp-1',
      dueDate: overrides.dueDate ?? new Date(Date.UTC(2026, 8, 20)),
      installmentNumber: 1,
      totalInstallments: 1,
      expectedAmount: 15075,
      paidAmount: null,
      paidAt: null,
      paidById: null,
      status: overrides.status ?? PaymentStatus.PENDING,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      expense: { title: 'Conta de luz', categoryId: 'cat-1' },
      paidBy: overrides.paidBy ?? null,
    };
  }

  /**
   * Retorna uma data UTC deslocada em `days` dias a partir de hoje (meia-noite).
   */
  function daysFromToday(days: number): Date {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // TAREFA 13 — badge do pagador sem N+1
  // ─────────────────────────────────────────────────────────────
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

      // Uma única chamada ao banco, independentemente do número de itens.
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
      // Datas relativas a hoje, garantindo determinismo em qualquer data de execução.
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

  // ─────────────────────────────────────────────────────────────
  // pay — resposta com paidBy hidratado (atualização otimista)
  // ─────────────────────────────────────────────────────────────
  describe('pay — resposta com badge do pagador', () => {
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
