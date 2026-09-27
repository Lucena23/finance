import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

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
}
