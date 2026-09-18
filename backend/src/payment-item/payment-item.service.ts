import { Injectable } from '@nestjs/common';
import { PaymentItem, PaymentStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { QueryPaymentItemsDto } from './dto/query-payment-items.dto';

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
 * PaymentItemService — Fila de pagamentos, quitação e ordenação por urgência.
 * ARCHITECTURE §3.2 — MÓDULO PAYMENT ITEMS — TAREFA 24.
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
