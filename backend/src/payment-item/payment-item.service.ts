import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentItem, PaymentStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { PlanService } from '../plan/plan.service';
import { PayItemDto } from './dto/pay-item.dto';
import { QueryHistoryDto } from './dto/query-history.dto';
import { QueryPaymentItemsDto } from './dto/query-payment-items.dto';
import { UpdatePaymentItemDto } from './dto/update-payment-item.dto';

/**
 * Item de pagamento com o badge do pagador (RN-08 / §8.8).
 *
 * O campo `paidBy` é resolvido via `include` do Prisma em uma ÚNICA query
 * (join), eliminando qualquer risco de N+1 (TAREFA 13). Quando o item ainda
 * está PENDING, `paidBy` é `null`.
 */
export type PaymentItemWithPayer = PaymentItem & {
  paidBy: { initials: string; avatarColor: string } | null;
};

/**
 * Fila de pagamentos agrupada por urgência (RN-06 / §8.5).
 *  - overdue:      dueDate < hoje (atraso) — indicador vermelho.
 *  - currentMonth: dueDate dentro do mês corrente e >= hoje — laranja.
 *  - upcoming:     dueDate em meses posteriores — azul.
 *
 * Cada item carrega o badge do pagador (`paidBy`) já hidratado, permitindo
 * que a UI exiba imediatamente as iniciais de quem quitou, sem refetch
 * adicional (TAREFA 13).
 */
export interface PaymentQueue {
  overdue: PaymentItemWithPayer[];
  currentMonth: PaymentItemWithPayer[];
  upcoming: PaymentItemWithPayer[];
}

/**
 * Resultado paginado do histórico de pagamentos.
 */
export interface PaginatedHistory {
  data: PaymentItemWithPayer[];
  total: number;
  page: number;
}

/**
 * PaymentItemService — Fila de pagamentos, quitação e ordenação por urgência.
 * ARCHITECTURE §3.2 — MÓDULO PAYMENT ITEMS — TAREFAS 24, 25, 26, 27.
 *
 * Isolamento multi-tenant (RN-01 / §8.3): TODAS as queries filtram por
 * `familyAccountId`, derivado exclusivamente do JWT pelo FamilyScopeInterceptor.
 *
 * RN-06 / §8.5: a ordenação é determinística e segue a hierarquia fixa
 * atraso → mês atual → futuros, com ORDER BY dueDate ASC em cada grupo.
 * Itens PAID NÃO aparecem na fila.
 */
@Injectable()
export class PaymentItemService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planService?: PlanService,
  ) {}

  /**
   * Retorna a fila de pagamentos pendentes do workspace, ordenada por urgência
   * (RN-06 / §8.5 — TAREFA 24).
   *
   * A hierarquia é aplicada em memória sobre o conjunto já ordenado por
   * `dueDate ASC`, garantindo determinismo e independência do fuso do banco.
   * PaymentItems de despesas soft-deleted são excluídos (RN-11 / §8.7).
   *
   * TAREFA 13: o `include` traz `paidBy { initials, avatarColor }` na MESMA
   * query (join único), sem N+1. Isso permite que a UI exiba imediatamente a
   * sigla do pagador em cards recém-quitados, sem uma segunda chamada.
   */
  async getQueue(
    familyAccountId: string,
    query: QueryPaymentItemsDto,
  ): Promise<PaymentQueue> {
    if (this.planService) {
      await this.planService.assertMonthAccess(
        familyAccountId,
        query.month,
        query.year,
      );
    }

    const today = this.today();
    const hasPremium = this.planService
      ? await this.planService.hasPremiumAccess(familyAccountId)
      : true;
    const freeWindowEnd =
      !hasPremium && this.planService ? this.planService.freeWindowEnd() : null;

    const items = await this.prisma.paymentItem.findMany({
      where: {
        status: PaymentStatus.PENDING,
        expense: {
          familyAccountId,
          deletedAt: null,
        },
      },
      include: {
        expense: { select: { title: true, categoryId: true } },
        paidBy: { select: { initials: true, avatarColor: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    const { month, year } = this.resolveReferencePeriod(query);
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 0));

    const overdue: PaymentItemWithPayer[] = [];
    const currentMonth: PaymentItemWithPayer[] = [];
    const upcoming: PaymentItemWithPayer[] = [];

    for (const item of items) {
      const due = this.normalizeDate(item.dueDate);

      if (due.getTime() < today.getTime()) {
        overdue.push(item);
      } else if (
        due.getTime() >= monthStart.getTime() &&
        due.getTime() <= monthEnd.getTime()
      ) {
        currentMonth.push(item);
      } else if (!freeWindowEnd || due.getTime() <= freeWindowEnd.getTime()) {
        upcoming.push(item);
      }
    }

    return { overdue, currentMonth, upcoming };
  }

  /**
   * Quita um PaymentItem (RN-07 — TAREFA 25), com suporte a:
   *  - Quitação exata (`paidAmount === expectedAmount`)
   *  - Pagamento parcial (`PARTIAL`): quita o valor pago e mantém o saldo restante em um novo card PENDING
   *  - Quitação com desconto (`DISCOUNT`): quita integralmente por valor menor, registrando a economia
   *  - Pagamento com juros/multa (`INTEREST`): quita com acréscimo pontual sem alterar parcelas futuras
   *  - Reajuste de valor (`READJUSTMENT`): quita com o novo valor e reajusta cobranças futuras pendentes
   */
  async pay(
    familyAccountId: string,
    id: string,
    paidById: string,
    dto: PayItemDto,
  ): Promise<PaymentItemWithPayer> {
    const item = await this.findItemInScope(familyAccountId, id);

    if (item.status === PaymentStatus.PAID) {
      throw new BadRequestException('Este item já foi quitado.');
    }

    const paidAt = this.parsePaidAt(dto.paidAt);
    const userNote = dto.notes?.trim() ?? '';
    const formatBrl = (cents: number): string =>
      (cents / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });

    // 1. Valor menor que o previsto: PARTIAL (default) ou DISCOUNT
    if (dto.paidAmount < item.expectedAmount) {
      const diff = item.expectedAmount - dto.paidAmount;
      const handling =
        dto.differenceHandling === 'DISCOUNT' ? 'DISCOUNT' : 'PARTIAL';

      if (handling === 'DISCOUNT') {
        const tag = `[Desconto: -${formatBrl(diff)}]`;
        const finalNote = userNote ? `${tag} ${userNote}` : tag;

        return this.prisma.paymentItem.update({
          where: { id },
          data: {
            status: PaymentStatus.PAID,
            paidAmount: dto.paidAmount,
            paidAt,
            paidById,
            notes: finalNote,
          },
          include: {
            paidBy: { select: { initials: true, avatarColor: true } },
          },
        });
      }

      // PARTIAL: quita a fração paga agora e cria um novo PaymentItem PENDING com o saldo restante
      const tag = `[Pagamento Parcial — Restante: ${formatBrl(diff)}]`;
      const finalNote = userNote ? `${tag} ${userNote}` : tag;
      const remainingNote = `[Saldo Restante — Original: ${formatBrl(item.expectedAmount)}]`;

      return this.prisma.$transaction(async (tx) => {
        const updatedPaid = await tx.paymentItem.update({
          where: { id },
          data: {
            status: PaymentStatus.PAID,
            expectedAmount: dto.paidAmount,
            paidAmount: dto.paidAmount,
            paidAt,
            paidById,
            notes: finalNote,
          },
          include: {
            paidBy: { select: { initials: true, avatarColor: true } },
          },
        });

        await tx.paymentItem.create({
          data: {
            expenseId: item.expenseId,
            dueDate: item.dueDate,
            installmentNumber: item.installmentNumber,
            totalInstallments: item.totalInstallments,
            expectedAmount: diff,
            status: PaymentStatus.PENDING,
            notes: remainingNote,
          },
        });

        return updatedPaid;
      });
    }

    // 2. Valor maior que o previsto: INTEREST (default) ou READJUSTMENT
    if (dto.paidAmount > item.expectedAmount) {
      const diff = dto.paidAmount - item.expectedAmount;
      const handling =
        dto.differenceHandling === 'READJUSTMENT' ? 'READJUSTMENT' : 'INTEREST';

      if (handling === 'INTEREST') {
        const tag = `[Juros/Multa: +${formatBrl(diff)}]`;
        const finalNote = userNote ? `${tag} ${userNote}` : tag;

        return this.prisma.paymentItem.update({
          where: { id },
          data: {
            status: PaymentStatus.PAID,
            paidAmount: dto.paidAmount,
            paidAt,
            paidById,
            notes: finalNote,
          },
          include: {
            paidBy: { select: { initials: true, avatarColor: true } },
          },
        });
      }

      // READJUSTMENT: quita este item pelo novo valor base e atualiza cobranças futuras pendentes
      const tag = `[Reajuste: +${formatBrl(diff)}]`;
      const finalNote = userNote ? `${tag} ${userNote}` : tag;

      return this.prisma.$transaction(async (tx) => {
        const updatedPaid = await tx.paymentItem.update({
          where: { id },
          data: {
            status: PaymentStatus.PAID,
            expectedAmount: dto.paidAmount,
            paidAmount: dto.paidAmount,
            paidAt,
            paidById,
            notes: finalNote,
          },
          include: {
            paidBy: { select: { initials: true, avatarColor: true } },
          },
        });

        await tx.paymentItem.updateMany({
          where: {
            expenseId: item.expenseId,
            status: PaymentStatus.PENDING,
            id: { not: id },
            dueDate: { gt: item.dueDate },
          },
          data: {
            expectedAmount: dto.paidAmount,
          },
        });

        const parentExpense = await tx.expense.findUnique({
          where: { id: item.expenseId },
          select: { type: true },
        });

        if (
          parentExpense?.type === 'RECURRENT' ||
          parentExpense?.type === 'SINGLE'
        ) {
          await tx.expense.update({
            where: { id: item.expenseId },
            data: { totalAmount: dto.paidAmount },
          });
        } else if (parentExpense?.type === 'INSTALLMENT') {
          const allItems = await tx.paymentItem.findMany({
            where: { expenseId: item.expenseId },
            select: { status: true, paidAmount: true, expectedAmount: true },
          });
          const newTotal = allItems.reduce(
            (acc, cur) =>
              acc +
              (cur.status === PaymentStatus.PAID
                ? (cur.paidAmount ?? cur.expectedAmount)
                : cur.expectedAmount),
            0,
          );
          await tx.expense.update({
            where: { id: item.expenseId },
            data: { totalAmount: newTotal },
          });
        }

        return updatedPaid;
      });
    }

    // 3. Quitação pelo valor exato previsto
    const wasRemainingBalance = item.notes?.startsWith('[Saldo Restante');
    const exactNote = userNote
      ? wasRemainingBalance
        ? `[Saldo Restante Quitado] ${userNote}`
        : userNote
      : wasRemainingBalance
        ? '[Saldo Restante Quitado]'
        : null;

    return this.prisma.paymentItem.update({
      where: { id },
      data: {
        status: PaymentStatus.PAID,
        paidAmount: dto.paidAmount,
        paidAt,
        paidById,
        notes: exactNote,
      },
      include: {
        paidBy: { select: { initials: true, avatarColor: true } },
      },
    });
  }

  /**
   * Desfaz a quitação de um PaymentItem (TAREFA 46).
   * Retorna o item ao estado PENDING. Se for um pagamento parcial cujo saldo
   * restante ainda está aberto, recompõe automaticamente o card único original.
   */
  async undoPay(
    familyAccountId: string,
    id: string,
  ): Promise<PaymentItem> {
    const item = await this.prisma.paymentItem.findFirst({
      where: {
        id,
        expense: { familyAccountId },
      },
      include: {
        expense: { select: { id: true, deletedAt: true } },
      },
    });

    if (!item) {
      throw new NotFoundException('Item de pagamento não encontrado.');
    }

    if (item.status === 'PENDING') {
      throw new BadRequestException('Este item não está quitado.');
    }

    if (item.expense.deletedAt !== null) {
      await this.prisma.$transaction(async (tx) => {
        await tx.paymentItem.delete({ where: { id } });
        const remainingPaid = await tx.paymentItem.count({
          where: { expenseId: item.expenseId, status: 'PAID' },
        });
        if (remainingPaid === 0) {
          await tx.paymentItem.deleteMany({ where: { expenseId: item.expenseId } });
          await tx.expense.delete({ where: { id: item.expenseId } });
        }
      });

      return {
        ...item,
        status: 'PENDING',
        paidAmount: null,
        paidAt: null,
        paidById: null,
        notes: null,
      };
    }

    if (item.notes?.startsWith('[Pagamento Parcial')) {
      const pendingSibling = await this.prisma.paymentItem.findFirst({
        where: {
          id: { not: item.id },
          expenseId: item.expenseId,
          installmentNumber: item.installmentNumber,
          dueDate: item.dueDate,
          status: PaymentStatus.PENDING,
        },
      });

      if (pendingSibling) {
        const mergedAmount = pendingSibling.expectedAmount + item.expectedAmount;
        const otherPartialsCount = await this.prisma.paymentItem.count({
          where: {
            id: { not: item.id },
            expenseId: item.expenseId,
            installmentNumber: item.installmentNumber,
            dueDate: item.dueDate,
            status: PaymentStatus.PAID,
          },
        });

        return this.prisma.$transaction(async (tx) => {
          await tx.paymentItem.delete({ where: { id: item.id } });
          return tx.paymentItem.update({
            where: { id: pendingSibling.id },
            data: {
              expectedAmount: mergedAmount,
              notes: otherPartialsCount > 0 ? pendingSibling.notes : null,
            },
          });
        });
      }
    }

    return this.prisma.paymentItem.update({
      where: { id },
      data: {
        status: 'PENDING',
        paidAmount: null,
        paidAt: null,
        paidById: null,
        notes: null,
      },
    });
  }

  /**
   * Ajuste fino do valor previsto de uma parcela (TAREFA 26).
   *
   * Atualiza expectedAmount de um item PENDING. Valida expectedAmount > 0.
   * Item PAID retorna 400. Escopo por workspace (RN-01 / §8.3).
   */
  async updateExpectedAmount(
    familyAccountId: string,
    id: string,
    dto: UpdatePaymentItemDto,
  ): Promise<PaymentItem> {
    const item = await this.findItemInScope(familyAccountId, id);

    if (item.status === PaymentStatus.PAID) {
      throw new BadRequestException(
        'Não é possível ajustar o valor de um item já quitado.',
      );
    }

    return this.prisma.paymentItem.update({
      where: { id },
      data: { expectedAmount: dto.expectedAmount },
    });
  }

  /**
   * Histórico de pagamentos já quitados com badge do pagador (RN-08 — TAREFA 27).
   *
   * Retorna itens PAID com paidBy { initials, avatarColor }. Filtros: month,
   * year, paidById, categoryId. Paginação com total. Escopo por workspace.
   */
  async getHistory(
    familyAccountId: string,
    query: QueryHistoryDto,
  ): Promise<PaginatedHistory> {
    if (this.planService) {
      await this.planService.assertMonthAccess(
        familyAccountId,
        query.month,
        query.year,
      );
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.PaymentItemWhereInput = {
      status: PaymentStatus.PAID,
      expense: {
        familyAccountId,
        ...(query.categoryId !== undefined
          ? { categoryId: query.categoryId }
          : {}),
      },
      ...(query.paidById !== undefined ? { paidById: query.paidById } : {}),
      ...this.buildPaidAtRange(query),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.paymentItem.findMany({
        where,
        include: {
          paidBy: { select: { initials: true, avatarColor: true } },
          expense: { select: { title: true, categoryId: true } },
        },
        orderBy: { paidAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.paymentItem.count({ where }),
    ]);

    return { data, total, page };
  }

  /**
   * Busca um PaymentItem garantindo o escopo familiar (RN-01 / §8.3).
   * Retorna 404 quando inexistente ou pertencente a outro workspace.
   */
  private async findItemInScope(
    familyAccountId: string,
    id: string,
  ): Promise<PaymentItem> {
    const item = await this.prisma.paymentItem.findFirst({
      where: {
        id,
        expense: { familyAccountId, deletedAt: null },
      },
    });

    if (!item) {
      throw new NotFoundException('Item de pagamento não encontrado.');
    }

    return item;
  }

  /**
   * Monta o filtro de intervalo de paidAt a partir de month/year (opcionais).
   * Sem month/year, não restringe o período.
   */
  private buildPaidAtRange(
    query: QueryHistoryDto,
  ): Pick<Prisma.PaymentItemWhereInput, 'paidAt'> {
    if (query.month === undefined && query.year === undefined) {
      return {};
    }

    const now = new Date();
    const year = query.year ?? now.getUTCFullYear();
    const month = query.month ?? now.getUTCMonth() + 1;

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    return { paidAt: { gte: start, lt: end } };
  }

  /**
   * Resolve o período de referência (mês/ano) para o agrupamento "mês atual".
   * Padrão: mês e ano correntes quando não informados na query.
   */
  private resolveReferencePeriod(query: QueryPaymentItemsDto): {
    month: number;
    year: number;
  } {
    const now = new Date();
    return {
      month: query.month ?? now.getUTCMonth() + 1,
      year: query.year ?? now.getUTCFullYear(),
    };
  }

  /**
   * Converte a string ISO 8601 de paidAt em Date.
   */
  private parsePaidAt(value: string): Date {
    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('paidAt inválido.');
    }

    return parsed;
  }

  /**
   * Normaliza uma data para meia-noite UTC, alinhada ao tipo @db.Date.
   */
  private normalizeDate(date: Date): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
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
