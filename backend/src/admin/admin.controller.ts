import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
import { AdminRefundDto } from '../plan/dto/admin-refund.dto';
import {
  AdminTransactionView,
  PlanPaymentService,
} from '../plan/plan-payment.service';
import { PlanInfo } from '../plan/plan.service';
import {
  AnnouncementService,
  PublishAnnouncementResult,
  SystemAnnouncement,
} from '../notification/announcement.service';
import { CreateAnnouncementDto } from '../notification/dto/create-announcement.dto';

/**
 * AdminController — Painel Aksurim (Admin Global). RN-15 / TAREFA 25 / 27 / v1.3.1.
 */
@Controller('admin')
@GlobalAdminOnly()
@UseGuards(GlobalAdminGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly leadExportService: LeadExportService,
    private readonly announcementService: AnnouncementService,
    private readonly planPaymentService?: PlanPaymentService,
  ) {}

  @Get('metrics')
  getMetrics(): Promise<AdminGlobalMetrics> {
    return this.adminService.getGlobalMetrics();
  }

  @Get('leads')
  getLeads(): Promise<AdminLead[]> {
    return this.adminService.getLeads();
  }

  @Patch('families/:id/plan')
  updateFamilyPlan(
    @Param('id') id: string,
    @Body() dto: UpdateFamilyPlanDto,
  ): Promise<PlanInfo> {
    return this.adminService.updateFamilyPlan(id, dto);
  }

  /**
   * GET /api/v1/admin/transactions
   * Histórico global de transações/assinaturas do Mercado Pago.
   */
  @Get('transactions')
  async getTransactions(): Promise<AdminTransactionView[]> {
    if (!this.planPaymentService) return [];
    return this.planPaymentService.adminListTransactions();
  }

  /**
   * DELETE /api/v1/admin/transactions/pending
   * Remove transações PENDING abandonadas após reconciliação segura no Mercado Pago.
   */
  @Delete('transactions/pending')
  async clearPendingTransactions(): Promise<{ deletedCount: number }> {
    if (!this.planPaymentService) return { deletedCount: 0 };
    return this.planPaymentService.adminClearPendingTransactions();
  }

  /**
   * POST /api/v1/admin/transactions/:id/refund
   * Dispara estorno Total ou Parcial de uma transação no Mercado Pago.
   */
  @Post('transactions/:id/refund')
  async refundTransaction(
    @Param('id') id: string,
    @Body() dto: AdminRefundDto,
  ): Promise<{ refunded: boolean; refundedAmountCents: number; plan: PlanInfo }> {
    if (!this.planPaymentService) {
      throw new Error('PlanPaymentService indisponível.');
    }
    return this.planPaymentService.adminRefundTransaction(id, dto);
  }

  /**
   * GET /api/v1/admin/announcements
   * Lista comunicados já enviados aos usuários (v1.3.1).
   */
  @Get('announcements')
  listAnnouncements(): Promise<SystemAnnouncement[]> {
    return this.announcementService.list();
  }

  /**
   * POST /api/v1/admin/announcements
   * Publica comunicado e dispara push de novidades do sistema (v1.3.1).
   */
  @Post('announcements')
  publishAnnouncement(
    @Body() dto: CreateAnnouncementDto,
  ): Promise<PublishAnnouncementResult> {
    return this.announcementService.publish({
      title: dto.title,
      body: dto.body,
      version: dto.version,
      sendPush: dto.sendPush ?? true,
    });
  }

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
