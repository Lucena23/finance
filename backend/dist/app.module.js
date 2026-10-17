"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const node_path_1 = require("node:path");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const schedule_1 = require("@nestjs/schedule");
const mailer_1 = require("@nestjs-modules/mailer");
const admin_module_1 = require("./admin/admin.module");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const auth_module_1 = require("./auth/auth.module");
const jwt_auth_guard_1 = require("./auth/jwt-auth.guard");
const category_module_1 = require("./category/category.module");
const family_scope_interceptor_1 = require("./common/interceptors/family-scope.interceptor");
const roles_guard_1 = require("./common/guards/roles.guard");
const dashboard_module_1 = require("./dashboard/dashboard.module");
const expense_module_1 = require("./expense/expense.module");
const family_account_module_1 = require("./family-account/family-account.module");
const notification_module_1 = require("./notification/notification.module");
const payment_item_module_1 = require("./payment-item/payment-item.module");
const prisma_module_1 = require("./prisma/prisma.module");
const support_module_1 = require("./support/support.module");
const user_module_1 = require("./user/user.module");
const reports_module_1 = require("./reports/reports.module");
const plan_module_1 = require("./plan/plan.module");
const plan_guard_1 = require("./plan/plan.guard");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: (0, node_path_1.join)(__dirname, '..', '.env'),
            }),
            mailer_1.MailerModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: async (config) => {
                    const port = Number(config.get('SMTP_PORT')) || 587;
                    return {
                        transport: {
                            host: config.get('SMTP_HOST') || 'mail.aksurim.com',
                            port,
                            secure: port === 465,
                            auth: {
                                user: config.get('SMTP_USER') || 'nao-responda@aksurim.com',
                                pass: config.get('SMTP_PASS'),
                            },
                        },
                        defaults: {
                            from: '"Aksurim Controle" <nao-responda@aksurim.com>',
                        },
                    };
                },
                inject: [config_1.ConfigService],
            }),
            schedule_1.ScheduleModule.forRoot(),
            plan_module_1.PlanModule,
            reports_module_1.ReportsModule,
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            user_module_1.UserModule,
            family_account_module_1.FamilyAccountModule,
            category_module_1.CategoryModule,
            expense_module_1.ExpenseModule,
            payment_item_module_1.PaymentItemModule,
            dashboard_module_1.DashboardModule,
            notification_module_1.NotificationModule,
            support_module_1.SupportModule,
            admin_module_1.AdminModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            app_service_1.AppService,
            {
                provide: core_1.APP_GUARD,
                useClass: jwt_auth_guard_1.JwtAuthGuard,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: roles_guard_1.RolesGuard,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: plan_guard_1.PlanGuard,
            },
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: family_scope_interceptor_1.FamilyScopeInterceptor,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map