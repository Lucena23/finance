import { BadRequestException, Injectable } from '@nestjs/common';
import { BillingCycle } from '@prisma/client';

import { maskCpfForDisplay } from '../common/utils/cpf.util';
import { PrismaService } from '../prisma/prisma.service';
import { PlanInfo, PlanService, computePlanStatus } from '../plan/plan.service';
import { PlanStatus } from '../plan/plan.constants';
import { AdminPlanAction, UpdateFamilyPlanDto } from './dto/update-family-plan.dto';

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
  premiumFamilies?: number;
  trialFamilies?: number;
  freeFamilies?: number;
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
  planStatus?: PlanStatus;
  planDaysLeft?: number | null;
  billingCycle?: BillingCycle | null;
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly planService?: PlanService,
  ) {}

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
        trialEndsAt: true,
        premiumEndsAt: true,
        billingCycle: true,
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

    const now = new Date();
    const graceDays = this.planService?.graceDays ?? 3;
    const leads: AdminLead[] = [];

    for (const family of families) {
      const computed = computePlanStatus(
        {
          trialEndsAt: family.trialEndsAt ?? null,
          premiumEndsAt: family.premiumEndsAt ?? null,
        },
        now,
        graceDays,
      );

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
          planStatus: computed.status,
          planDaysLeft: computed.daysLeft,
          billingCycle: family.billingCycle ?? null,
        });
      }
    }

    return leads;
  }

  /**
   * Atualiza manualmente o plano de uma família (Admin Global).
   */
  async updateFamilyPlan(
    targetFamilyId: string,
    dto: UpdateFamilyPlanDto,
  ): Promise<PlanInfo> {
    if (!this.planService) {
      throw new BadRequestException('PlanService indisponível.');
    }

    switch (dto.action) {
      case AdminPlanAction.GRANT_PREMIUM:
        return this.planService.grantPremium(
          targetFamilyId,
          dto.billingCycle ?? BillingCycle.MONTHLY,
        );
      case AdminPlanAction.EXTEND_TRIAL:
        return this.planService.extendTrial(
          targetFamilyId,
          dto.trialDays ?? this.planService.trialDays,
        );
      case AdminPlanAction.REVOKE:
        return this.planService.revokePremium(targetFamilyId);
      default:
        throw new BadRequestException('Ação de plano inválida.');
    }
  }
}
