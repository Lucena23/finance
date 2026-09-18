import { Module } from '@nestjs/common';

import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

/**
 * DashboardModule — Painel gerencial (cards, distribuição por categoria,
 * evolução mensal). Exclusivamente saídas (RN-09).
 * ARCHITECTURE §2 — TAREFA 28.
 */
@Module({
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
