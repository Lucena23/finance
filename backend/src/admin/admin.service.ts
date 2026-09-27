import { Injectable } from '@nestjs/common';

import { maskCpfForDisplay } from '../common/utils/cpf.util';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Métricas globais do Painel Aksurim (RN-15 / TAREFA 25).
 * Operam de forma EXPLÍCITA cross-tenant — o escopo familiar é ignorado
 * apenas porque a rota é protegida por @GlobalAdminOnly() + GlobalAdminGuard.
 */
export interface AdminGlobalMetrics {
  totalFamilies: number;
  totalUsers: number;
  totalActiveUsers: number;
  totalExpenses: number;
  totalPaidAmount: number;
  totalPendingAmount: number;
  familiesCreatedLast30Days: number;
  usersCreatedLast30Days: number;
}

/**
 * Lead comercial exportável (RN-15 / TAREFA 27).
 * O CPF é sempre mascarado (***.***.XXX-XX) — nunca exposto integralmente.
 */
export interface AdminLead {
  familyAccountId: string;
  familyName: string;
  ownerCpfMasked: string;
  userName: string;
  userEmail: string;
  userWhatsapp: string | null;
  userRole: string;
  isEmailVerified: boolean;
  createdAt: string;
}

/**
 * AdminService — métricas globais e extração de leads do Painel Aksurim.
 * RN-15 / TAREFA 25.
 *
 * ATENÇÃO: este service é o ÚNICO ponto autorizado a consultar dados
 * cross-tenant. Ele NUNCA deve ser exposto fora de rotas marcadas com
 * @GlobalAdminOnly() e protegidas pelo GlobalAdminGuard.
 */
@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Agrega as métricas globais de toda a base de clientes.
   */
  async getGlobalMetrics(): Promise<AdminGlobalMetrics> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalFamilies,
      totalUsers,
      totalActiveUsers,
      totalExpenses,
      paidAggregate,
      pendingAggregate,
      familiesCreatedLast30Days,
      usersCreatedLast30Days,
    ] = await this.prisma.$transaction([
      this.prisma.familyAccount.count(),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isEmailVerified: true } }),
      this.prisma.expense.count({ where: { deletedAt: null } }),
      this.prisma.paymentItem.aggregate({
        where: { status: 'PAID' },
        _sum: { paidAmount: true },
      }),
      this.prisma.paymentItem.aggregate({
        where: { status: 'PENDING' },
        _sum: { expectedAmount: true },
      }),
      this.prisma.familyAccount.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    return {
      totalFamilies,
      totalUsers,
      totalActiveUsers,
      totalExpenses,
      totalPaidAmount: paidAggregate._sum.paidAmount ?? 0,
      totalPendingAmount: pendingAggregate._sum.expectedAmount ?? 0,
      familiesCreatedLast30Days,
      usersCreatedLast30Days,
    };
  }

  /**
   * Extrai a lista de leads comerciais (famílias + titulares) para exportação.
   * O CPF é retornado SEMPRE mascarado (***.***.XXX-XX) — RN-02 / §5.5.
   */
  async getLeads(): Promise<AdminLead[]> {
    const families = await this.prisma.familyAccount.findMany({
      select: {
        id: true,
        name: true,
        ownerCpf: true,
        createdAt: true,
        users: {
          select: {
            name: true,
            email: true,
            whatsapp: true,
            role: true,
            isEmailVerified: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const leads: AdminLead[] = [];

    for (const family of families) {
      for (const user of family.users) {
        leads.push({
          familyAccountId: family.id,
          familyName: family.name,
          ownerCpfMasked: maskCpfForDisplay(family.ownerCpf),
          userName: user.name,
          userEmail: user.email,
          userWhatsapp: user.whatsapp,
          userRole: user.role,
          isEmailVerified: user.isEmailVerified,
          createdAt: user.createdAt.toISOString(),
        });
      }
    }

    return leads;
  }
}
