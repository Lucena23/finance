"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NotificationCron_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationCron = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const notification_priority_service_1 = require("./notification-priority.service");
let NotificationCron = NotificationCron_1 = class NotificationCron {
    constructor(priorityService) {
        this.priorityService = priorityService;
        this.logger = new common_1.Logger(NotificationCron_1.name);
    }
    async handleDailyDispatch() {
        this.logger.log('Iniciando varredura diária de pendências (05:00 BRT).');
        const results = await this.priorityService.dispatchAll();
        for (const result of results) {
            this.logger.log(`workspace=${result.familyAccountId} prioridade=${result.priority} ` +
                `pendências=${result.pendingCount} notificadas=${result.notifiedSubscriptions}`);
        }
        this.logger.log(`Varredura concluída: ${results.length} workspace(s) avaliado(s).`);
    }
};
exports.NotificationCron = NotificationCron;
__decorate([
    (0, schedule_1.Cron)('0 5 * * *', {
        name: 'daily-push-dispatch',
        timeZone: 'America/Sao_Paulo',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NotificationCron.prototype, "handleDailyDispatch", null);
exports.NotificationCron = NotificationCron = NotificationCron_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [notification_priority_service_1.NotificationPriorityService])
], NotificationCron);
//# sourceMappingURL=notification.cron.js.map