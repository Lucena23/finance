import { Module } from '@nestjs/common';

import { AnnouncementService } from './announcement.service';
import { NotificationController } from './notification.controller';
import { NotificationPriorityService } from './notification-priority.service';
import { NotificationCron } from './notification.cron';
import { NotificationService } from './notification.service';

/**
 * NotificationModule — Web Push Notifications e Comunicados do Sistema.
 * ARCHITECTURE §3.2 — MÓDULO NOTIFICATIONS — TAREFAS 31, 32, 33 / v1.3.1.
 */
@Module({
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationPriorityService,
    NotificationCron,
    AnnouncementService,
  ],
  exports: [NotificationService, NotificationPriorityService, AnnouncementService],
})
export class NotificationModule {}
