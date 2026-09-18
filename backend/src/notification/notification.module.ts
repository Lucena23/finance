import { Module } from '@nestjs/common';

import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

/**
 * NotificationModule — Web Push Notifications.
 * ARCHITECTURE §3.2 — MÓDULO NOTIFICATIONS — TAREFA 31.
 *
 * Expõe o NotificationService para o motor de prioridade (TAREFA 32) e o
 * Cron Job de disparo (TAREFA 33).
 */
@Module({
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
