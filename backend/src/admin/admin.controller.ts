import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';

import { GlobalAdminOnly } from '../common/decorators/global-admin.decorator';
import { GlobalAdminGuard } from '../common/guards/global-admin.guard';
import {
  AdminGlobalMetrics,
  AdminLead,
  AdminService,
} from './admin.service';
import {
  LeadExportFormat,
  LeadExportService,
} from './lead-export.service';
import { UpdateFamilyPlanDto } from './dto/update-family-plan.dto';
import { PlanInfo } from '../plan/plan.service';

/**
 * AdminController — Painel Aksurim (Admin Global). RN-15 / TAREFA 25 / 27.
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
  constructor(
    private readonly adminService: AdminService,
    private readonly leadExportService: LeadExportService,
  ) {}

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

  /**
   * PATCH /api/v1/admin/families/:id/plan
   * Ativa, estende ou revoga o plano Premium de uma Conta Familiar.
   */
  @Patch('families/:id/plan')
  updateFamilyPlan(
    @Param('id') id: string,
    @Body() dto: UpdateFamilyPlanDto,
  ): Promise<PlanInfo> {
    return this.adminService.updateFamilyPlan(id, dto);
  }

  /**
   * GET /api/v1/admin/leads/export?format=pdf|csv
   * Exporta os leads comerciais em PDF (apresentação a parceiros de crédito)
   * ou CSV (planilha). TAREFA 27 / RN-15.
   *
   * Campos obrigatórios: Nome, E-mail, CPF mascarado, Data e Status.
   * O CPF é SEMPRE mascarado (***.***.XXX-XX) — LGPD / §5.5.
   */
  @Get('leads/export')
  async exportLeads(
    @Query('format') format: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const normalized: LeadExportFormat = format === 'csv' ? 'csv' : 'pdf';

    const leads = await this.adminService.getLeads();
    const result = await this.leadExportService.export(leads, normalized);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    res.setHeader('Content-Length', result.buffer.length.toString());
    res.end(result.buffer);
  }
}
