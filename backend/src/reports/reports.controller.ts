import { Controller, Get, Optional, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FamilyScopeParam } from '../common/decorators/family-scope.decorator';
import { FamilyScope } from '../common/interceptors/family-scope.interceptor';
import { RequiresPremium } from '../plan/plan.decorators';
import { PremiumFeature } from '../plan/plan.constants';
import { PlanService } from '../plan/plan.service';
import { ReportsService } from './reports.service';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    @Optional() private readonly planService?: PlanService,
  ) {}

  @RequiresPremium(PremiumFeature.REPORTS)
  @Get('pdf')
  async generatePdfReport(
    @CurrentUser() user: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('type') type: 'sintetico' | 'analitico',
    @Res() res: Response,
  ) {
    const pdfDoc = await this.reportsService.generateFinancialReport(
      user,
      startDate,
      endDate,
      type,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=Relatorio_Aksurim_${type}.pdf`,
    });

    pdfDoc.pipe(res);
    pdfDoc.end();
  }

  /**
   * GET /api/v1/reports/csv — Exportação simples de portabilidade de dados (LGPD).
   * Liberada ao ADMIN em todos os planos (Free e Premium) e aos membros no Premium.
   * No plano Free, membros ficam em modo somente leitura (assertMemberCanWrite).
   */
  @Get('csv')
  async exportCsv(
    @FamilyScopeParam() scope: FamilyScope,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    if (this.planService && user?.role) {
      await this.planService.assertMemberCanWrite(
        scope.familyAccountId,
        user.role,
      );
    }

    const csvContent = await this.reportsService.generateCsvExport(
      scope.familyAccountId,
    );

    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="Dados_Aksurim_Controle.csv"',
    });

    res.send(csvContent);
  }
}
