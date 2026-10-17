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
var PlanReminderCron_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanReminderCron = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const mailer_1 = require("@nestjs-modules/mailer");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const plan_service_1 = require("./plan.service");
const REMINDER_DAYS = new Set([7, 3, 1]);
let PlanReminderCron = PlanReminderCron_1 = class PlanReminderCron {
    constructor(prisma, planService, mailerService) {
        this.prisma = prisma;
        this.planService = planService;
        this.mailerService = mailerService;
        this.logger = new common_1.Logger(PlanReminderCron_1.name);
    }
    async handleDailyReminders() {
        const now = new Date();
        const graceDays = this.planService.graceDays;
        const families = await this.prisma.familyAccount.findMany({
            select: {
                id: true,
                name: true,
                trialEndsAt: true,
                premiumEndsAt: true,
                users: {
                    where: { role: client_1.Role.ADMIN },
                    select: { name: true, email: true },
                },
            },
        });
        let sent = 0;
        for (const family of families) {
            const computed = (0, plan_service_1.computePlanStatus)({
                trialEndsAt: family.trialEndsAt ?? null,
                premiumEndsAt: family.premiumEndsAt ?? null,
            }, now, graceDays);
            if ((computed.status === 'TRIAL' || computed.status === 'GRACE') &&
                computed.daysLeft !== null &&
                REMINDER_DAYS.has(computed.daysLeft)) {
                const owner = family.users[0];
                if (!owner)
                    continue;
                const isGrace = computed.status === 'GRACE';
                const subject = isGrace
                    ? `⚠️ Seu acesso Premium encerra em ${computed.daysLeft} dia(s) — Aksurim Controle`
                    : `👑 Faltam ${computed.daysLeft} dia(s) do seu teste Premium — Aksurim Controle`;
                await this.mailerService
                    .sendMail({
                    to: owner.email,
                    subject,
                    html: `<p>Olá, <strong>${owner.name}</strong>!</p>
<p>${isGrace
                        ? `Você está nos últimos <strong>${computed.daysLeft} dia(s) de tolerância</strong> do plano Premium da família <strong>${family.name}</strong>.`
                        : `Seu período de teste 👑 Premium da família <strong>${family.name}</strong> termina em <strong>${computed.daysLeft} dia(s)</strong>.`}</p>
<p>Seus lançamentos permanecem salvos com total segurança. Assine o 👑 Premium por menos de R$ 0,33 ao dia para manter acesso a todos os meses, relatórios em PDF e membros da família ativos.</p>`,
                })
                    .catch((err) => this.logger.warn(`Falha ao enviar lembrete para ${owner.email}: ${err}`));
                sent++;
            }
        }
        this.logger.log(`Lembretes de plano processados: ${sent} enviado(s).`);
    }
};
exports.PlanReminderCron = PlanReminderCron;
__decorate([
    (0, schedule_1.Cron)('0 9 * * *', {
        name: 'daily-plan-expiration-reminder',
        timeZone: 'America/Sao_Paulo',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PlanReminderCron.prototype, "handleDailyReminders", null);
exports.PlanReminderCron = PlanReminderCron = PlanReminderCron_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        plan_service_1.PlanService,
        mailer_1.MailerService])
], PlanReminderCron);
//# sourceMappingURL=plan-reminder.cron.js.map