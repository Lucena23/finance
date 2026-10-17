import { Controller, Get, Query } from '@nestjs/common';

import { FamilyScopeParam } from '../common/decorators/family-scope.decorator';
import { FamilyScope } from '../common/interceptors/family-scope.interceptor';
import { LockedSummaryQueryDto } from './dto/locked-summary-query.dto';
import { LockedMonthSummary, PlanInfo, PlanService } from './plan.service';

/**
 * PlanController — informações do plano Freemium da família autenticada.
 * Escopo SEMPRE derivado do JWT (RN-01 / §8.3).
 */
@Controller('plan')
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  /** GET /api/v1/plan — status, dias restantes e limites do plano. */
  @Get()
  getPlan(@FamilyScopeParam() scope: FamilyScope): Promise<PlanInfo> {
    return this.planService.getPlanInfo(scope.familyAccountId);
  }

  /**
   * GET /api/v1/plan/locked-summary?month=&year=
   * Quantidade e total de um mês (para o desfoque). Sem detalhes.
   */
  @Get('locked-summary')
  getLockedSummary(
    @FamilyScopeParam() scope: FamilyScope,
    @Query() query: LockedSummaryQueryDto,
  ): Promise<LockedMonthSummary> {
    return this.planService.getLockedMonthSummary(
      scope.familyAccountId,
      query.month,
      query.year,
    );
  }
}
