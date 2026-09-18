import { join } from 'node:path';

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { PrismaModule } from '../prisma/prisma.module';
import { NotificationPriorityService } from './notification-priority.service';
import { NotificationCron } from './notification.cron';

/**
 * NotificationCronModule — contexto NestJS mínimo para o Cron Job standalone.
 * ARCHITECTURE §4.1 — TAREFA 33.
 *
 * Não registra controllers nem guards globais: é executado via
 * `node dist/notification-cron.js` pelo Cron Job do cPanel (05:00 BRT).
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(__dirname, '..', '..', '.env'),
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
  ],
  providers: [NotificationPriorityService, NotificationCron],
})
export class NotificationCronModule {}
