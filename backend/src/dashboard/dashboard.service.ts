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
 * Distribuição de gastos por categoria (gráfico de Rosca — RN-09).
 * Valores em CENTAVOS (Int) — RN-04 / §8.2.
 *
 * `percentage` é um número fracionário (0-100) usado EXCLUSIVAMENTE para
 * exibição no gráfico — NÃO representa valor monetário, portanto não viola
 * a regra de inteiros em centavos (§8.2).
 */
export interface CategoryDistribution {
  categoryId: string;
  name: string;
  color: string;
  totalAmount: number;
  percentage: number;
}

/**
 * DashboardService — Agregações do painel gerencial.
 * ARCHITECTURE §3.2 — MÓDULO DASHBOARD — TAREFAS 28, 29.
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
   * Distribuição percentual de gastos por categoria no mês de referência
   * (gráfico de Rosca — RN-09 — TAREFA 29).
   *
   * Considera EXCLUSIVAMENTE saídas: soma o `expectedAmount` de todos os
   * PaymentItems (PENDING e PAID) cujo vencimento cai no mês de referência,
   * agrupados pela categoria da despesa. Despesas soft-deleted são ignoradas
   * (RN-11 / §8.7).
   *
   * O `percentage` é calculado sobre o total do mês. A soma dos percentuais
   * pode divergir de 100% em até ±0,01 por categoria devido ao arredondamento
   * para 2 casas decimais — tolerância documentada e aceita para exibição.
   */
  async getCategoryDistribution(
    familyAccountId: string,
    query: QueryDashboardDto,
  ): Promise<CategoryDistribution[]> {
    const { month, year } = this.resolveReferencePeriod(query);
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 0));

    const items = await this.prisma.paymentItem.findMany({
      where: {
        dueDate: { gte: monthStart, lte: monthEnd },
        expense: { familyAccountId, deletedAt: null },
      },
      select: {
        expectedAmount: true,
        expense: {
          select: {
            category: {
              select: { id: true, name: true, color: true },
            },
          },
        },
      },
    });

    // Agrega os valores (em centavos) por categoria.
    const totalsByCategory = new Map<
      string,
      { name: string; color: string; totalAmount: number }
    >();

    for (const item of items) {
      const category = item.expense.category;
      const current = totalsByCategory.get(category.id);
      if (current) {
        current.totalAmount += item.expectedAmount;
      } else {
        totalsByCategory.set(category.id, {
          name: category.name,
          color: category.color,
          totalAmount: item.expectedAmount,
        });
      }
    }

    const grandTotal = Array.from(totalsByCategory.values()).reduce(
      (sum, entry) => sum + entry.totalAmount,
      0,
    );

    const distribution: CategoryDistribution[] = Array.from(
      totalsByCategory.entries(),
    ).map(([categoryId, entry]) => ({
      categoryId,
      name: entry.name,
      color: entry.color,
      totalAmount: entry.totalAmount,
      percentage:
        grandTotal > 0
          ? this.roundPercentage((entry.totalAmount / grandTotal) * 100)
          : 0,
    }));

    // Ordena da maior para a menor participação (mais relevante primeiro).
    distribution.sort((a, b) => b.totalAmount - a.totalAmount);

    return distribution;
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

  /**
   * Arredonda um percentual para 2 casas decimais.
   * Usado apenas para exibição — não representa valor monetário (§8.2).
   */
  private roundPercentage(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
