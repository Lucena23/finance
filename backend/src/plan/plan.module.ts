import { Global, Module } from '@nestjs/common';

import { PlanController } from './plan.controller';
import { PlanGuard } from './plan.guard';
import { PlanReminderCron } from './plan-reminder.cron';
import { PlanService } from './plan.service';

/**
 * PlanModule — Freemium (v1.2). Global para que qualquer módulo injete
 * o PlanService sem reimportar.
 */
@Global()
@Module({
  controllers: [PlanController],
  providers: [PlanService, PlanGuard, PlanReminderCron],
  exports: [PlanService, PlanGuard],
})
export class PlanModule {}
