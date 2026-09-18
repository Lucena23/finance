import { NestFactory } from '@nestjs/core';

import { NotificationCronModule } from './notification/notification-cron.module';
import { NotificationPriorityService } from './notification/notification-priority.service';

/**
 * Entry point standalone do Cron Job de Web Push.
 * ARCHITECTURE §4.1 — TAREFA 33.
 *
 * Executado pelo Cron Job do cPanel às 05:00 BRT:
 *   cd /home/usuario/.apps/gestao-gastos-api && node dist/notification-cron.js
 *
 * Cria um contexto NestJS mínimo (sem servidor HTTP), executa a varredura de
 * pendências uma única vez e encerra o processo com código de saída adequado.
 */
async function run(): Promise<void> {
  const app = await NestFactory.createApplicationContext(
    NotificationCronModule,
    { logger: ['log', 'warn', 'error'] },
  );

  try {
    const priorityService = app.get(NotificationPriorityService);
    const results = await priorityService.dispatchAll();

    for (const result of results) {
      // eslint-disable-next-line no-console -- saída de log do Cron Job (§8.6)
      console.log(
        `[notification-cron] workspace=${result.familyAccountId} ` +
          `prioridade=${result.priority} pendências=${result.pendingCount} ` +
          `notificadas=${result.notifiedSubscriptions}`,
      );
    }

    // eslint-disable-next-line no-console -- saída de log do Cron Job (§8.6)
    console.log(
      `[notification-cron] Concluído: ${results.length} workspace(s) avaliado(s).`,
    );
  } finally {
    await app.close();
  }
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console -- saída de erro do Cron Job (§8.6)
    console.error(`[notification-cron] Falha na execução: ${message}`);
    process.exit(1);
  });
