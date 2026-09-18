import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Expense,
  ExpenseRecurrenceStatus,
  ExpenseType,
  PaymentItem,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

/**
 * Despesa com seus PaymentItems (parcelas/obrigações) — ARCHITECTURE §3.2.
 */
export type ExpenseWithItems = Expense & { paymentItems: PaymentItem[] };

/**
 * Resultado paginado da listagem de despesas — ARCHITECTURE §3.2.
 */
export interface PaginatedExpenses {
  data: Expense[];
  total: number;
  page: number;
}

/**
 * ExpenseService — CRUD de despesas e motor de geração de PaymentItems.
 * ARCHITECTURE §3.2 — MÓDULO EXPENSES — TAREFAS 18, 19, 20, 21, 22, 23.
 *
 * Isolamento multi-tenant (RN-01 / §8.3): TODAS as queries filtram por
 * `familyAccountId`, derivado exclusivamente do JWT pelo FamilyScopeInterceptor.
 *
 * RN-04 / §8.2: valores monetários são inteiros em CENTAVOS. A distribuição de
 * parcelas usa aritmética inteira — nunca ponto flutuante.
 */
@Injectable()
export class ExpenseService {
  /**
   * Horizonte de projeção mensal para despesas RECURRENT (mês corrente +
   * meses futuros visíveis). 12 meses cobre a evolução anual do dashboard.
   */
  private static readonly RECURRENT_PROJECTION_MONTHS = 12;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista despesas ativas do workspace (filtra deletedAt IS NULL — RN-11 / §8.7).
   * Escopo obrigatório por familyAccountId (RN-01 / §8.3).
   */
  async findAll(
    familyAccountId: string,
    query: QueryExpensesDto,
  ): Promise<PaginatedExpenses> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.ExpenseWhereInput = {
      familyAccountId,
      deletedAt: null,
      ...(query.type !== undefined ? { type: query.type } : {}),
      ...(query.categoryId !== undefined
        ? { categoryId: query.categoryId }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.expense.count({ where }),
    ]);

    return { data, total, page };
  }

  /**
   * Detalhe de uma despesa ativa com seus PaymentItems.
   * Retorna 404 se não pertencer ao workspace (RN-01 / §8.3).
   */
  async findOne(
    familyAccountId: string,
    id: string,
  ): Promise<ExpenseWithItems> {
    const expense = await this.prisma.expense.findFirst({
      where: { id, familyAccountId, deletedAt: null },
      include: {
        paymentItems: { orderBy: { installmentNumber: 'asc' } },
      },
    });

    if (!expense) {
      throw new NotFoundException('Despesa não encontrada.');
    }

    return expense;
  }

  /**
   * Cria uma despesa e gera automaticamente os PaymentItems conforme o tipo
   * (RN-05 / §8.4). O familyAccountId e o createdById derivam do JWT.
   */
  async create(
    familyAccountId: string,
    createdById: string,
    dto: CreateExpenseDto,
  ): Promise<ExpenseWithItems> {
    await this.assertCategoryInScope(familyAccountId, dto.categoryId);

    const dueDate = this.parseDueDate(dto.dueDate);

    return this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          title: dto.title.trim(),
          description: dto.description?.trim() ?? null,
          type: dto.type,
          totalAmount: dto.totalAmount,
          categoryId: dto.categoryId,
          familyAccountId,
          createdById,
        },
      });

      const items = this.buildPaymentItems(expense, dueDate, dto);

      await tx.paymentItem.createMany({ data: items });

      const paymentItems = await tx.paymentItem.findMany({
        where: { expenseId: expense.id },
        orderBy: { installmentNumber: 'asc' },
      });

      return { ...expense, paymentItems };
    });
  }

  /**
   * Atualiza parcialmente uma despesa ativa.
   * Para RECURRENT, a alteração de totalAmount reflete apenas em PaymentItems
   * futuros (PENDING e dueDate > hoje) — itens passados/pagos são imutáveis
   * (RN-05 / §8.4 — TAREFA 22).
   */
  async update(
    familyAccountId: string,
    id: string,
    dto: UpdateExpenseDto,
  ): Promise<Expense> {
    const expense = await this.findOneOrFail(familyAccountId, id);

    if (dto.categoryId !== undefined) {
      await this.assertCategoryInScope(familyAccountId, dto.categoryId);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.expense.update({
        where: { id },
        data: {
          ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description.trim() }
            : {}),
          ...(dto.categoryId !== undefined
            ? { categoryId: dto.categoryId }
            : {}),
          ...(dto.totalAmount !== undefined
            ? { totalAmount: dto.totalAmount }
            : {}),
        },
      });

      // RN-05 / §8.4 — RECURRENT: novo valor base aplica-se apenas a futuros.
      if (
        expense.type === ExpenseType.RECURRENT &&
        dto.totalAmount !== undefined
      ) {
        await tx.paymentItem.updateMany({
          where: {
            expenseId: id,
            status: 'PENDING',
            dueDate: { gt: this.today() },
          },
          data: { expectedAmount: dto.totalAmount },
        });
      }

      return updated;
    });
  }

  /**
   * Soft delete — preenche deletedAt com o timestamp atual (RN-11 / §8.7).
   * O registro NÃO é apagado fisicamente.
   */
  async softDelete(familyAccountId: string, id: string): Promise<void> {
    await this.findOneOrFail(familyAccountId, id);

    await this.prisma.expense.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Restaura uma despesa soft-deleted — limpa deletedAt (RN-11 / §8.7).
   */
  async restore(familyAccountId: string, id: string): Promise<Expense> {
    const expense = await this.prisma.expense.findFirst({
      where: { id, familyAccountId, deletedAt: { not: null } },
    });

    if (!expense) {
      throw new NotFoundException('Despesa excluída não encontrada.');
    }

    return this.prisma.expense.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  /**
   * Encerra a recorrência de uma despesa RECURRENT (RN-05 / §8.4 — TAREFA 23).
   * Define statusRecurrence = CANCELLED e remove fisicamente os PaymentItems
   * PENDING futuros; itens pagos são preservados.
   */
  async cancelRecurrence(
    familyAccountId: string,
    id: string,
  ): Promise<Expense> {
    const expense = await this.findOneOrFail(familyAccountId, id);

    if (expense.type !== ExpenseType.RECURRENT) {
      throw new BadRequestException(
        'Apenas despesas recorrentes podem ter a recorrência encerrada.',
      );
    }

    if (expense.statusRecurrence === ExpenseRecurrenceStatus.CANCELLED) {
      throw new BadRequestException('A recorrência já está encerrada.');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.paymentItem.deleteMany({
        where: {
          expenseId: id,
          status: 'PENDING',
          dueDate: { gt: this.today() },
        },
      });

      return tx.expense.update({
        where: { id },
        data: { statusRecurrence: ExpenseRecurrenceStatus.CANCELLED },
      });
    });
  }

  /**
   * Motor de geração de PaymentItems por tipo de despesa (RN-05 / §8.4).
   *  - SINGLE: 1 item (installmentNumber=1, totalInstallments=1).
   *  - INSTALLMENT: N itens com aritmética inteira (resíduo na última).
   *  - RECURRENT: projeção mensal (mês corrente + meses futuros visíveis).
   */
  private buildPaymentItems(
    expense: Expense,
    dueDate: Date,
    dto: CreateExpenseDto,
  ): Prisma.PaymentItemCreateManyInput[] {
    switch (expense.type) {
      case ExpenseType.SINGLE:
        return this.buildSingleItems(expense, dueDate);
      case ExpenseType.INSTALLMENT:
        return this.buildInstallmentItems(expense, dueDate, dto);
      case ExpenseType.RECURRENT:
        return this.buildRecurrentItems(expense, dueDate);
      default:
        // Exaustividade: o enum ExpenseType cobre todos os casos acima.
        throw new BadRequestException('Tipo de despesa não suportado.');
    }
  }

  /**
   * SINGLE — exatamente 1 PaymentItem (RN-05 / §8.4 — TAREFA 19).
   * installmentNumber = 1, totalInstallments = 1, expectedAmount = totalAmount.
   */
  private buildSingleItems(
    expense: Expense,
    dueDate: Date,
  ): Prisma.PaymentItemCreateManyInput[] {
    return [
      {
        expenseId: expense.id,
        dueDate,
        installmentNumber: 1,
        totalInstallments: 1,
        expectedAmount: expense.totalAmount,
        status: 'PENDING',
      },
    ];
  }

  /**
   * INSTALLMENT — N PaymentItems com aritmética inteira (RN-05 / §8.2 — TAREFA 20).
   * Parcelas 1..N-1 = floor(totalAmount / N); última = totalAmount - (valor*(N-1)).
   * A soma das parcelas é EXATAMENTE igual a totalAmount (sem ponto flutuante).
   */
  private buildInstallmentItems(
    expense: Expense,
    firstDueDate: Date,
    dto: CreateExpenseDto,
  ): Prisma.PaymentItemCreateManyInput[] {
    const total = dto.totalInstallments;

    if (total === undefined || total < 2) {
      throw new BadRequestException(
        'totalInstallments é obrigatório (mínimo 2) para despesas parceladas.',
      );
    }

    const baseAmount = Math.floor(expense.totalAmount / total);
    const lastAmount = expense.totalAmount - baseAmount * (total - 1);

    const items: Prisma.PaymentItemCreateManyInput[] = [];

    for (let i = 1; i <= total; i += 1) {
      items.push({
        expenseId: expense.id,
        dueDate: this.addMonths(firstDueDate, i - 1),
        installmentNumber: i,
        totalInstallments: total,
        expectedAmount: i === total ? lastAmount : baseAmount,
        status: 'PENDING',
      });
    }

    return items;
  }

  /**
   * RECURRENT — projeção mensal contínua (RN-05 / §8.4 — TAREFA 21).
   * Gera itens do mês corrente até o horizonte de projeção visível.
   * installmentNumber sequencial; totalInstallments = 0 (indeterminado).
   */
  private buildRecurrentItems(
    expense: Expense,
    firstDueDate: Date,
  ): Prisma.PaymentItemCreateManyInput[] {
    const items: Prisma.PaymentItemCreateManyInput[] = [];

    for (let i = 0; i < ExpenseService.RECURRENT_PROJECTION_MONTHS; i += 1) {
      items.push({
        expenseId: expense.id,
        dueDate: this.addMonths(firstDueDate, i),
        installmentNumber: i + 1,
        totalInstallments: 0,
        expectedAmount: expense.totalAmount,
        status: 'PENDING',
      });
    }

    return items;
  }

  /**
   * Garante que a categoria pertence ao workspace autenticado (RN-01 / §8.3).
   */
  private async assertCategoryInScope(
    familyAccountId: string,
    categoryId: string,
  ): Promise<void> {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, familyAccountId },
      select: { id: true },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada.');
    }
  }

  /**
   * Busca uma despesa ativa garantindo o escopo familiar.
   * Retorna 404 quando inexistente, soft-deleted ou de outro workspace.
   */
  private async findOneOrFail(
    familyAccountId: string,
    id: string,
  ): Promise<Expense> {
    const expense = await this.prisma.expense.findFirst({
      where: { id, familyAccountId, deletedAt: null },
    });

    if (!expense) {
      throw new NotFoundException('Despesa não encontrada.');
    }

    return expense;
  }

  /**
   * Converte a string ISO 8601 em Date normalizada para meia-noite UTC,
   * alinhada ao tipo @db.Date do PaymentItem.dueDate.
   */
  private parseDueDate(value: string): Date {
    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('dueDate inválido.');
    }

    return new Date(
      Date.UTC(
        parsed.getUTCFullYear(),
        parsed.getUTCMonth(),
        parsed.getUTCDate(),
      ),
    );
  }

  /**
   * Incrementa N meses preservando o dia, com clamp para o último dia do mês
   * quando o dia não existir no mês destino (ex: 31/01 + 1 mês → 28/02).
   */
  private addMonths(date: Date, months: number): Date {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();

    const targetMonthIndex = month + months;
    const targetYear = year + Math.floor(targetMonthIndex / 12);
    const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;

    const lastDayOfTargetMonth = new Date(
      Date.UTC(targetYear, normalizedMonth + 1, 0),
    ).getUTCDate();

    const clampedDay = Math.min(day, lastDayOfTargetMonth);

    return new Date(Date.UTC(targetYear, normalizedMonth, clampedDay));
  }

  /**
   * Data de hoje normalizada para meia-noite UTC (comparações de vencimento).
   */
  private today(): Date {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  }
}
