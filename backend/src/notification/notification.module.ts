import { Module } from '@nestjs/common';

import { NotificationController } from './notification.controller';
import { NotificationPriorityService } from './notification-priority.service';
import { NotificationCron } from './notification.cron';
import { NotificationService } from './notification.service';

/**
 * NotificationModule — Web Push Notifications.
 * ARCHITECTURE §3.2 — MÓDULO NOTIFICATIONS — TAREFAS 31, 32, 33.
 *
 * Expõe o NotificationService (subscribe/unsubscribe) e o motor de prioridade
 * (NotificationPriorityService) acionado pelo Cron Job diário (05:00 BRT).
 */
@Module({
  controllers: [NotificationController],
  providers: [NotificationService, NotificationPriorityService, NotificationCron],
  exports: [NotificationService, NotificationPriorityService],
})
export class NotificationModule {}
