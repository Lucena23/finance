import { Module } from '@nestjs/common';

import { GlobalAdminGuard } from '../common/guards/global-admin.guard';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { LeadExportService } from './lead-export.service';

/**
 * AdminModule — Painel Aksurim (Admin Global). RN-15 / TAREFA 25 / 27.
 *
 * Expõe as rotas globais cross-tenant protegidas pelo GlobalAdminGuard.
 * O PrismaService é provido globalmente pelo PrismaModule.
 *
 * TAREFA 27: o LeadExportService serializa os leads em PDF/CSV sem acessar
 * o banco — a extração cross-tenant permanece exclusiva do AdminService.
 */
@Module({
  controllers: [AdminController],
  providers: [AdminService, LeadExportService, GlobalAdminGuard],
  exports: [AdminService, LeadExportService],
})
export class AdminModule {}
