import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MailerService } from '@nestjs-modules/mailer';
import { Role } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { PlanService, computePlanStatus } from './plan.service';

const REMINDER_DAYS = new Set([7, 3, 1]);

@Injectable()
export class PlanReminderCron {
  private readonly logger = new Logger(PlanReminderCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly planService: PlanService,
    private readonly mailerService: MailerService,
  ) {}

  /**
   * Varredura diária às 09:00 BRT para avisos de 7, 3 e 1 dia antes do
   * vencimento do teste ou do período de tolerância.
   */
  @Cron('0 9 * * *', {
    name: 'daily-plan-expiration-reminder',
    timeZone: 'America/Sao_Paulo',
  })
  async handleDailyReminders(): Promise<void> {
    const now = new Date();
    const graceDays = this.planService.graceDays;
    const families = await this.prisma.familyAccount.findMany({
      select: {
        id: true,
        name: true,
        trialEndsAt: true,
        premiumEndsAt: true,
        users: {
          where: { role: Role.ADMIN },
          select: { name: true, email: true },
        },
      },
    });

    let sent = 0;

    for (const family of families) {
      const computed = computePlanStatus(
        {
          trialEndsAt: family.trialEndsAt ?? null,
          premiumEndsAt: family.premiumEndsAt ?? null,
        },
        now,
        graceDays,
      );

      if (
        (computed.status === 'TRIAL' || computed.status === 'GRACE') &&
        computed.daysLeft !== null &&
        REMINDER_DAYS.has(computed.daysLeft)
      ) {
        const owner = family.users[0];
        if (!owner) continue;

        const isGrace = computed.status === 'GRACE';
        const subject = isGrace
          ? `⚠️ Seu acesso Premium encerra em ${computed.daysLeft} dia(s) — Aksurim Controle`
          : `👑 Faltam ${computed.daysLeft} dia(s) do seu teste Premium — Aksurim Controle`;

        await this.mailerService
          .sendMail({
            to: owner.email,
            subject,
            html: `<p>Olá, <strong>${owner.name}</strong>!</p>
<p>${
              isGrace
                ? `Você está nos últimos <strong>${computed.daysLeft} dia(s) de tolerância</strong> do plano Premium da família <strong>${family.name}</strong>.`
                : `Seu período de teste 👑 Premium da família <strong>${family.name}</strong> termina em <strong>${computed.daysLeft} dia(s)</strong>.`
            }</p>
<p>Seus lançamentos permanecem salvos com total segurança. Assine o 👑 Premium por menos de R$ 0,33 ao dia para manter acesso a todos os meses, relatórios em PDF e membros da família ativos.</p>`,
          })
          .catch((err) =>
            this.logger.warn(`Falha ao enviar lembrete para ${owner.email}: ${err}`),
          );

        sent++;
      }
    }

    this.logger.log(`Lembretes de plano processados: ${sent} enviado(s).`);
  }
}
