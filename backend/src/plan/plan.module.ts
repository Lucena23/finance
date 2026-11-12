import { Global, Module } from '@nestjs/common';

import { PlanController } from './plan.controller';
import { PlanGuard } from './plan.guard';
import { PlanPaymentService } from './plan-payment.service';
import { PlanReminderCron } from './plan-reminder.cron';
import { PlanService } from './plan.service';

/**
 * PlanModule — Freemium (v1.2) + Pagamentos Mercado Pago (v1.3).
 * Global para que qualquer módulo injete PlanService e PlanPaymentService.
 */
@Global()
@Module({
  controllers: [PlanController],
  providers: [PlanService, PlanPaymentService, PlanGuard, PlanReminderCron],
  exports: [PlanService, PlanPaymentService, PlanGuard],
})
export class PlanModule {}
