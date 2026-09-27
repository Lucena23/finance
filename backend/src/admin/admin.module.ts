import { Module } from '@nestjs/common';

import { GlobalAdminGuard } from '../common/guards/global-admin.guard';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

/**
 * AdminModule — Painel Aksurim (Admin Global). RN-15 / TAREFA 25.
 *
 * Expõe as rotas globais cross-tenant protegidas pelo GlobalAdminGuard.
 * O PrismaService é provido globalmente pelo PrismaModule.
 */
@Module({
  controllers: [AdminController],
  providers: [AdminService, GlobalAdminGuard],
  exports: [AdminService],
})
export class AdminModule {}
