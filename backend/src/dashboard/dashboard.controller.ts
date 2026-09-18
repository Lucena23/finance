import { Controller, Get, Query } from '@nestjs/common';

import { FamilyScopeParam } from '../common/decorators/family-scope.decorator';
import { FamilyScope } from '../common/interceptors/family-scope.interceptor';
import { DashboardService, DashboardSummary } from './dashboard.service';
import { QueryDashboardDto } from './dto/query-dashboard.dto';

/**
 * DashboardController — Painel gerencial (exclusivamente saídas — RN-09).
 * ARCHITECTURE §3.2 — MÓDULO DASHBOARD — TAREFA 28.
 *
 * O familyAccountId é SEMPRE derivado do JWT via FamilyScopeInterceptor
 * (RN-01 / §8.3) — nunca aceito como parâmetro de query/body.
 * Acessível a ADMIN e MEMBER (RN-03).
 */
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * Cards resumo do mês: total pago, total a pagar e divisão por membro.
   * Valores em CENTAVOS (Int) — RN-04 / §8.2.
   */
  @Get('summary')
  getSummary(
    @FamilyScopeParam() scope: FamilyScope,
    @Query() query: QueryDashboardDto,
  ): Promise<DashboardSummary> {
    return this.dashboardService.getSummary(scope.familyAccountId, query);
  }
}
