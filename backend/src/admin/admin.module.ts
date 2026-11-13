import { Module } from '@nestjs/common';

import { GlobalAdminGuard } from '../common/guards/global-admin.guard';
import { NotificationModule } from '../notification/notification.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { LeadExportService } from './lead-export.service';

/**
 * AdminModule — Painel Aksurim (Admin Global). RN-15 / TAREFA 25 / 27 / v1.3.1.
 *
 * Expõe as rotas globais cross-tenant protegidas pelo GlobalAdminGuard.
 */
@Module({
  imports: [NotificationModule],
  controllers: [AdminController],
  providers: [AdminService, LeadExportService, GlobalAdminGuard],
  exports: [AdminService, LeadExportService],
})
export class AdminModule {}
