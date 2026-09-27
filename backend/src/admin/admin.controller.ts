import { Controller, Get, UseGuards } from '@nestjs/common';

import { GlobalAdminOnly } from '../common/decorators/global-admin.decorator';
import { GlobalAdminGuard } from '../common/guards/global-admin.guard';
import {
  AdminGlobalMetrics,
  AdminLead,
  AdminService,
} from './admin.service';

/**
 * AdminController — Painel Aksurim (Admin Global). RN-15 / TAREFA 25.
 *
 * Todas as rotas são marcadas com @GlobalAdminOnly(), o que:
 *  1. Habilita o bypass condicional do FamilyScopeInterceptor (TAREFA 24);
 *  2. Ativa o GlobalAdminGuard, que exige `isGlobalAdmin === true`.
 *
 * Prefixo global da API: /api/v1 → rotas finais em /api/v1/admin/*.
 *
 * IMPORTANTE (RN-15): Role.ADMIN (chefe de família) NÃO tem acesso aqui.
 */
@Controller('admin')
@GlobalAdminOnly()
@UseGuards(GlobalAdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * GET /api/v1/admin/metrics
   * Métricas globais: total de clientes, ativos por período e volumes.
   */
  @Get('metrics')
  getMetrics(): Promise<AdminGlobalMetrics> {
    return this.adminService.getGlobalMetrics();
  }

  /**
   * GET /api/v1/admin/leads
   * Lista de leads comerciais (CPF sempre mascarado) para exportação.
   */
  @Get('leads')
  getLeads(): Promise<AdminLead[]> {
    return this.adminService.getLeads();
  }
}
