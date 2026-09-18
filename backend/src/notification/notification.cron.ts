import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { NotificationPriorityService } from './notification-priority.service';

/**
 * NotificationCron — Cron Job de disparo de Web Push.
 * REGRAS §8.6 / ARCHITECTURE §4.1 — TAREFA 33.
 *
 * Schedule: `0 5 * * *` (diariamente às 05:00 BRT).
 * O timezone é garantido por TZ=America/Sao_Paulo no .env (§8.11), de modo
 * que a expressão cron opera no fuso BRT/BRST.
 *
 * Itera TODAS as FamilyAccounts ativas e loga o resultado de disparo por
 * workspace (prioridade, pendências e subscriptions notificadas).
 */
@Injectable()
export class NotificationCron {
  private readonly logger = new Logger(NotificationCron.name);

  constructor(
    private readonly priorityService: NotificationPriorityService,
  ) {}

  /**
   * Rotina diária de varredura e disparo (05:00 BRT).
   */
  @Cron('0 5 * * *', {
    name: 'daily-push-dispatch',
    timeZone: 'America/Sao_Paulo',
  })
  async handleDailyDispatch(): Promise<void> {
    this.logger.log('Iniciando varredura diária de pendências (05:00 BRT).');

    const results = await this.priorityService.dispatchAll();

    for (const result of results) {
      this.logger.log(
        `workspace=${result.familyAccountId} prioridade=${result.priority} ` +
          `pendências=${result.pendingCount} notificadas=${result.notifiedSubscriptions}`,
      );
    }

    this.logger.log(
      `Varredura concluída: ${results.length} workspace(s) avaliado(s).`,
    );
  }
}
