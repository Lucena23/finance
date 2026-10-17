"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationCronModule = void 0;
const node_path_1 = require("node:path");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const prisma_module_1 = require("../prisma/prisma.module");
const notification_priority_service_1 = require("./notification-priority.service");
const notification_cron_1 = require("./notification.cron");
let NotificationCronModule = class NotificationCronModule {
};
exports.NotificationCronModule = NotificationCronModule;
exports.NotificationCronModule = NotificationCronModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: (0, node_path_1.join)(__dirname, '..', '..', '.env'),
            }),
            schedule_1.ScheduleModule.forRoot(),
            prisma_module_1.PrismaModule,
        ],
        providers: [notification_priority_service_1.NotificationPriorityService, notification_cron_1.NotificationCron],
    })
], NotificationCronModule);
//# sourceMappingURL=notification-cron.module.js.map