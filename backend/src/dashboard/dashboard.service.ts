import { Injectable } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { QueryDashboardDto } from './dto/query-dashboard.dto';

/**
 * Divisão proporcional de pagamentos por membro do workspace (RN-08 / RN-09).
 * Valores em CENTAVOS (Int) — RN-04 / §8.2.
 */
export interface MemberBreakdown {
  userId: string;
  name: string;
  initials: string;
  avatarColor: string;
  totalPaid: number;
}

/**
 * Resumo mensal do painel gerencial (cards + divisão por membro).
 * Valores em CENTAVOS (Int) — RN-04 / §8.2.
 */
export interface DashboardSummary {
  totalPaidMonth: number;
  totalPendingMonth: number;
  memberBreakdown: MemberBreakdown[];
}

/**
 * DashboardService — Agregações do painel gerencial.
 * ARCHITECTURE §3.2 — MÓDULO DASHBOARD — TAREFA 28.
 *
 * Isolamento multi-tenant (RN-01 / §8.3): TODAS as queries filtram por
 * `familyAccountId`, derivado exclusivamente do JWT pelo FamilyScopeInterceptor.
 *
 * RN-09: o painel contempla EXCLUSIVAMENTE saídas (despesas). Não há receitas.
 * RN-04 / §8.2: todos os valores são inteiros em CENTAVOS.
 * RN-11 / §8.7: PaymentItems de despesas soft-deleted são ignorados.
 */
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resumo do mês: total pago, total a pagar e divisão proporcional por membro
   * (RN-09 — TAREFA 28).
   *
   * - totalPaidMonth: soma de paidAmount dos itens PAID com paidAt no mês.
   * - totalPendingMonth: soma de expectedAmount dos itens PENDING com dueDate
   *   dentro do mês de referência.
   * - memberBreakdown: total pago por membro (paidById) no mês de referência.
   */
  async getSummary(
    familyAccountId: string,
    query: QueryDashboardDto,
  ): Promise<DashboardSummary> {
    const { month, year } = this.resolveReferencePeriod(query);
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 0));

    const [paidItems, pendingItems, members] = await this.prisma.$transaction([
      // Itens quitados cujo pagamento ocorreu no mês de referência.
      this.prisma.paymentItem.findMany({
        where: {
          status: PaymentStatus.PAID,
          paidAt: { gte: monthStart, lte: this.endOfDay(monthEnd) },
          expense: { familyAccountId, deletedAt: null },
        },
        select: { paidAmount: true, paidById: true },
      }),
      // Itens pendentes com vencimento dentro do mês de referência.
      this.prisma.paymentItem.findMany({
        where: {
          status: PaymentStatus.PENDING,
          dueDate: { gte: monthStart, lte: monthEnd },
          expense: { familyAccountId, deletedAt: null },
        },
        select: { expectedAmount: true },
      }),
      // Membros do workspace para compor a divisão por membro.
      this.prisma.user.findMany({
        where: { familyAccountId },
        select: {
          id: true,
          name: true,
          initials: true,
          avatarColor: true,
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    const totalPaidMonth = paidItems.reduce(
      (sum, item) => sum + (item.paidAmount ?? 0),
      0,
    );

    const totalPendingMonth = pendingItems.reduce(
      (sum, item) => sum + item.expectedAmount,
      0,
    );

    const paidByMember = new Map<string, number>();
    for (const item of paidItems) {
      if (!item.paidById) {
        continue;
      }
      paidByMember.set(
        item.paidById,
        (paidByMember.get(item.paidById) ?? 0) + (item.paidAmount ?? 0),
      );
    }

    const memberBreakdown: MemberBreakdown[] = members.map((member) => ({
      userId: member.id,
      name: member.name,
      initials: member.initials,
      avatarColor: member.avatarColor,
      totalPaid: paidByMember.get(member.id) ?? 0,
    }));

    return { totalPaidMonth, totalPendingMonth, memberBreakdown };
  }

  /**
   * Resolve o período de referência (mês/ano).
   * Padrão: mês e ano correntes quando não informados na query.
   */
  private resolveReferencePeriod(query: QueryDashboardDto): {
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
   * Retorna o último instante do dia (23:59:59.999 UTC) para incluir todo o
   * dia de `paidAt` no intervalo do mês.
   */
  private endOfDay(date: Date): Date {
    return new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );
  }
}
