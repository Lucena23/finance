import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  ExpenseRecurrenceStatus,
  ExpenseType,
  PaymentStatus,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { ExpenseService } from './expense.service';

/**
 * Testes unitários do motor de geração de PaymentItems (TAREFA 51).
 *
 * Cobre os três tipos de despesa (RN-05 / §8.4):
 *  - SINGLE: exatamente 1 PaymentItem.
 *  - INSTALLMENT: N itens com aritmética inteira e resíduo na última parcela.
 *  - RECURRENT: projeção mensal e edição de valor base apenas em itens futuros.
 *
 * Foco em aritmética inteira (RN-04 / §8.2) — nenhum ponto flutuante.
 * O PrismaService é mockado — nenhuma conexão real de banco é necessária.
 */
describe('ExpenseService — geração de PaymentItems', () => {
  let service: ExpenseService;
  let prisma: {
    $transaction: jest.Mock;
    expense: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
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
    prisma = {
      $transaction: jest.fn(),
      expense: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      paymentItem: {
        createMany: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
      },
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

  /**
   * Extrai o array de PaymentItems passado para `createMany`.
   */
  function createdItems(): Array<{
    installmentNumber: number;
    totalInstallments: number;
    expectedAmount: number;
    dueDate: Date;
    status: string;
  }> {
    return prisma.paymentItem.createMany.mock.calls[0][0].data;
  }

  // ─────────────────────────────────────────────────────────────
  // SINGLE — TAREFA 19
  // ─────────────────────────────────────────────────────────────
  describe('SINGLE', () => {
    it('gera exatamente 1 PaymentItem com installmentNumber=1 e totalInstallments=1', async () => {
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

      const items = createdItems();
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        installmentNumber: 1,
        totalInstallments: 1,
        expectedAmount: 15075,
        status: PaymentStatus.PENDING,
      });
      expect(items[0].dueDate.toISOString()).toBe('2026-09-20T00:00:00.000Z');
    });

    it('preserva o valor total exato em centavos (RN-04 / §8.2)', async () => {
      mockTransaction();
      prisma.category.findFirst.mockResolvedValue({ id: 'cat-1' });
      prisma.expense.create.mockResolvedValue({
        id: 'exp-1b',
        type: ExpenseType.SINGLE,
        totalAmount: 1,
      });
      prisma.paymentItem.createMany.mockResolvedValue({ count: 1 });
      prisma.paymentItem.findMany.mockResolvedValue([]);

      await service.create('fam-1', 'user-1', {
        title: 'Centavo',
        type: ExpenseType.SINGLE,
        totalAmount: 1,
        categoryId: 'cat-1',
        dueDate: '2026-09-20T00:00:00.000Z',
      });

      expect(createdItems()[0].expectedAmount).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // INSTALLMENT — TAREFA 20
  // ─────────────────────────────────────────────────────────────
  describe('INSTALLMENT', () => {
    it('distribui parcelas com aritmética inteira e resíduo na última', async () => {
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

      const sum = createdItems().reduce(
        (acc, item) => acc + item.expectedAmount,
        0,
      );
      expect(sum).toBe(10000);
    });

    it('atribui o resíduo à última parcela em divisão não exata (7 parcelas)', async () => {
      mockTransaction();
      prisma.category.findFirst.mockResolvedValue({ id: 'cat-1' });
      prisma.expense.create.mockResolvedValue({
        id: 'exp-2c',
        type: ExpenseType.INSTALLMENT,
        totalAmount: 10000,
      });
      prisma.paymentItem.createMany.mockResolvedValue({ count: 7 });
      prisma.paymentItem.findMany.mockResolvedValue([]);

      await service.create('fam-1', 'user-1', {
        title: 'Geladeira',
        type: ExpenseType.INSTALLMENT,
        totalAmount: 10000,
        categoryId: 'cat-1',
        dueDate: '2026-09-20T00:00:00.000Z',
        totalInstallments: 7,
      });

      const items = createdItems();
      expect(items).toHaveLength(7);
      // floor(10000 / 7) = 1428 → 6 parcelas de 1428 + última de 1432.
      expect(items.slice(0, 6).every((i) => i.expectedAmount === 1428)).toBe(
        true,
      );
      expect(items[6].expectedAmount).toBe(1432);

      const sum = items.reduce((acc, item) => acc + item.expectedAmount, 0);
      expect(sum).toBe(10000);
    });

    it('incrementa o vencimento em 1 mês por parcela', async () => {
      mockTransaction();
      prisma.category.findFirst.mockResolvedValue({ id: 'cat-1' });
      prisma.expense.create.mockResolvedValue({
        id: 'exp-2d',
        type: ExpenseType.INSTALLMENT,
        totalAmount: 30000,
      });
      prisma.paymentItem.createMany.mockResolvedValue({ count: 3 });
      prisma.paymentItem.findMany.mockResolvedValue([]);

      await service.create('fam-1', 'user-1', {
        title: 'Sofá',
        type: ExpenseType.INSTALLMENT,
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
        type: ExpenseType.INSTALLMENT,
        totalAmount: 20000,
      });
      prisma.paymentItem.createMany.mockResolvedValue({ count: 2 });
      prisma.paymentItem.findMany.mockResolvedValue([]);

      await service.create('fam-1', 'user-1', {
        title: 'TV',
        type: ExpenseType.INSTALLMENT,
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

    it('rejeita INSTALLMENT sem totalInstallments informado', async () => {
      mockTransaction();
      prisma.category.findFirst.mockResolvedValue({ id: 'cat-1' });
      prisma.expense.create.mockResolvedValue({
        id: 'exp-3b',
        type: ExpenseType.INSTALLMENT,
        totalAmount: 5000,
      });

      await expect(
        service.create('fam-1', 'user-1', {
          title: 'Sem parcelas',
          type: ExpenseType.INSTALLMENT,
          totalAmount: 5000,
          categoryId: 'cat-1',
          dueDate: '2026-09-20T00:00:00.000Z',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // RECURRENT — TAREFAS 21 e 22
  // ─────────────────────────────────────────────────────────────
  describe('RECURRENT', () => {
    it('gera projeção mensal com totalInstallments=0 e installmentNumber sequencial', async () => {
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

      const items = createdItems();
      expect(items.length).toBeGreaterThanOrEqual(1);
      expect(items[0]).toMatchObject({
        installmentNumber: 1,
        totalInstallments: 0,
        expectedAmount: 8990,
        status: PaymentStatus.PENDING,
      });

      // installmentNumber sequencial 1..N.
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
        type: ExpenseType.RECURRENT,
        totalAmount: 12345,
      });
      prisma.paymentItem.createMany.mockResolvedValue({ count: 12 });
      prisma.paymentItem.findMany.mockResolvedValue([]);

      await service.create('fam-1', 'user-1', {
        title: 'Aluguel',
        type: ExpenseType.RECURRENT,
        totalAmount: 12345,
        categoryId: 'cat-1',
        dueDate: '2026-09-10T00:00:00.000Z',
      });

      expect(
        createdItems().every((item) => item.expectedAmount === 12345),
      ).toBe(true);
    });

    it('edita totalAmount de RECURRENT aplicando apenas a itens futuros PENDING (§8.4)', async () => {
      mockTransaction();
      prisma.expense.findFirst.mockResolvedValue({
        id: 'exp-5',
        type: ExpenseType.RECURRENT,
        totalAmount: 8990,
        statusRecurrence: ExpenseRecurrenceStatus.ACTIVE,
      });
      prisma.expense.update.mockResolvedValue({
        id: 'exp-5',
        type: ExpenseType.RECURRENT,
        totalAmount: 9990,
      });
      prisma.paymentItem.updateMany.mockResolvedValue({ count: 5 });

      await service.update('fam-1', 'exp-5', { totalAmount: 9990 });

      expect(prisma.paymentItem.updateMany).toHaveBeenCalledTimes(1);
      const arg = prisma.paymentItem.updateMany.mock.calls[0][0];
      expect(arg.where).toMatchObject({
        expenseId: 'exp-5',
        status: PaymentStatus.PENDING,
      });
      // Filtro de data: apenas itens com dueDate > hoje.
      expect(arg.where.dueDate).toHaveProperty('gt');
      expect(arg.where.dueDate.gt).toBeInstanceOf(Date);
      expect(arg.data).toEqual({ expectedAmount: 9990 });
    });

    it('NÃO propaga alteração de valor para despesas não recorrentes', async () => {
      mockTransaction();
      prisma.expense.findFirst.mockResolvedValue({
        id: 'exp-6',
        type: ExpenseType.SINGLE,
        totalAmount: 5000,
        statusRecurrence: ExpenseRecurrenceStatus.ACTIVE,
      });
      prisma.expense.update.mockResolvedValue({
        id: 'exp-6',
        type: ExpenseType.SINGLE,
        totalAmount: 6000,
      });

      await service.update('fam-1', 'exp-6', { totalAmount: 6000 });

      expect(prisma.paymentItem.updateMany).not.toHaveBeenCalled();
    });

    it('encerra recorrência removendo apenas PaymentItems PENDING futuros (TAREFA 23)', async () => {
      mockTransaction();
      prisma.expense.findFirst.mockResolvedValue({
        id: 'exp-7',
        type: ExpenseType.RECURRENT,
        totalAmount: 8990,
        statusRecurrence: ExpenseRecurrenceStatus.ACTIVE,
      });
      prisma.paymentItem.deleteMany.mockResolvedValue({ count: 4 });
      prisma.expense.update.mockResolvedValue({
        id: 'exp-7',
        statusRecurrence: ExpenseRecurrenceStatus.CANCELLED,
      });

      await service.cancelRecurrence('fam-1', 'exp-7');

      const arg = prisma.paymentItem.deleteMany.mock.calls[0][0];
      expect(arg.where).toMatchObject({
        expenseId: 'exp-7',
        status: PaymentStatus.PENDING,
      });
      expect(arg.where.dueDate).toHaveProperty('gt');
      expect(prisma.expense.update).toHaveBeenCalledWith({
        where: { id: 'exp-7' },
        data: { statusRecurrence: ExpenseRecurrenceStatus.CANCELLED },
      });
    });

    it('rejeita encerrar recorrência de despesa não recorrente', async () => {
      prisma.expense.findFirst.mockResolvedValue({
        id: 'exp-8',
        type: ExpenseType.SINGLE,
        statusRecurrence: ExpenseRecurrenceStatus.ACTIVE,
      });

      await expect(
        service.cancelRecurrence('fam-1', 'exp-8'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejeita encerrar recorrência já cancelada', async () => {
      prisma.expense.findFirst.mockResolvedValue({
        id: 'exp-9',
        type: ExpenseType.RECURRENT,
        statusRecurrence: ExpenseRecurrenceStatus.CANCELLED,
      });

      await expect(
        service.cancelRecurrence('fam-1', 'exp-9'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Validações de escopo e entrada
  // ─────────────────────────────────────────────────────────────
  describe('validações de escopo e entrada', () => {
    it('rejeita criação quando a categoria não pertence ao workspace', async () => {
      prisma.category.findFirst.mockResolvedValue(null);

      await expect(
        service.create('fam-1', 'user-1', {
          title: 'Órfã',
          type: ExpenseType.SINGLE,
          totalAmount: 1000,
          categoryId: 'cat-alheia',
          dueDate: '2026-09-20T00:00:00.000Z',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejeita dueDate inválido', async () => {
      prisma.category.findFirst.mockResolvedValue({ id: 'cat-1' });

      await expect(
        service.create('fam-1', 'user-1', {
          title: 'Data ruim',
          type: ExpenseType.SINGLE,
          totalAmount: 1000,
          categoryId: 'cat-1',
          dueDate: 'data-invalida',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('retorna 404 ao buscar despesa de outro workspace', async () => {
      prisma.expense.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('fam-1', 'exp-alheia'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
