"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const notification_cron_module_1 = require("./notification/notification-cron.module");
const notification_priority_service_1 = require("./notification/notification-priority.service");
async function run() {
    const app = await core_1.NestFactory.createApplicationContext(notification_cron_module_1.NotificationCronModule, { logger: ['log', 'warn', 'error'] });
    try {
        const priorityService = app.get(notification_priority_service_1.NotificationPriorityService);
        const results = await priorityService.dispatchAll();
        for (const result of results) {
            console.log(`[notification-cron] workspace=${result.familyAccountId} ` +
                `prioridade=${result.priority} pendências=${result.pendingCount} ` +
                `notificadas=${result.notifiedSubscriptions}`);
        }
        console.log(`[notification-cron] Concluído: ${results.length} workspace(s) avaliado(s).`);
    }
    finally {
        await app.close();
    }
}
run()
    .then(() => {
    process.exit(0);
})
    .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[notification-cron] Falha na execução: ${message}`);
    process.exit(1);
});
//# sourceMappingURL=notification-cron.js.map