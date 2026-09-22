import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentItem, PaymentStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { PayItemDto } from './dto/pay-item.dto';
import { QueryHistoryDto } from './dto/query-history.dto';
import { QueryPaymentItemsDto } from './dto/query-payment-items.dto';
import { UpdatePaymentItemDto } from './dto/update-payment-item.dto';

/**
 * Fila de pagamentos agrupada por urgência (RN-06 / §8.5).
 *  - overdue:      dueDate < hoje (atraso) — indicador vermelho.
 *  - currentMonth: dueDate dentro do mês corrente e >= hoje — laranja.
 *  - upcoming:     dueDate em meses posteriores — azul.
 */
export interface PaymentQueue {
  overdue: PaymentItem[];
  currentMonth: PaymentItem[];
  upcoming: PaymentItem[];
}

/**
 * Item de pagamento quitado com o badge do pagador (RN-08 / §8.8).
 */
export type PaymentItemWithPayer = PaymentItem & {
  paidBy: { initials: string; avatarColor: string } | null;
};

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
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retorna a fila de pagamentos pendentes do workspace, ordenada por urgência
   * (RN-06 / §8.5 — TAREFA 24).
   *
   * A hierarquia é aplicada em memória sobre o conjunto já ordenado por
   * `dueDate ASC`, garantindo determinismo e independência do fuso do banco.
   * PaymentItems de despesas soft-deleted são excluídos (RN-11 / §8.7).
   */
  async getQueue(
    familyAccountId: string,
    query: QueryPaymentItemsDto,
  ): Promise<PaymentQueue> {
    const today = this.today();

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
      },
      orderBy: { dueDate: 'asc' },
    });

    const { month, year } = this.resolveReferencePeriod(query);
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 0));

    const overdue: PaymentItem[] = [];
    const currentMonth: PaymentItem[] = [];
    const upcoming: PaymentItem[] = [];

    for (const item of items) {
      const due = this.normalizeDate(item.dueDate);

      if (due.getTime() < today.getTime()) {
        overdue.push(item);
      } else if (
        due.getTime() >= monthStart.getTime() &&
        due.getTime() <= monthEnd.getTime()
      ) {
        currentMonth.push(item);
      } else {
        upcoming.push(item);
      }
    }

    return { overdue, currentMonth, upcoming };
  }

  /**
   * Quita um PaymentItem (RN-07 — TAREFA 25).
   *
   * Grava paidAmount, paidAt e paidById (usuário logado) e transiciona o
   * status PENDING → PAID de forma IRREVERSÍVEL. Valida paidAmount > 0 e que
   * o item esteja PENDING. Item já pago retorna 400.
   *
   * Escopo obrigatório por familyAccountId (RN-01 / §8.3): item de outro
   * workspace retorna 404.
   */
  async pay(
    familyAccountId: string,
    id: string,
    paidById: string,
    dto: PayItemDto,
  ): Promise<PaymentItem> {
    const item = await this.findItemInScope(familyAccountId, id);

    if (item.status === PaymentStatus.PAID) {
      throw new BadRequestException('Este item já foi quitado.');
    }

    const paidAt = this.parsePaidAt(dto.paidAt);

    return this.prisma.paymentItem.update({
      where: { id },
      data: {
        status: PaymentStatus.PAID,
        paidAmount: dto.paidAmount,
        paidAt,
        paidById,
        notes: dto.notes?.trim() ?? null,
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
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.PaymentItemWhereInput = {
      status: PaymentStatus.PAID,
      expense: {
        familyAccountId,
        deletedAt: null,
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
