import { MailerService } from '@nestjs-modules/mailer';
import { PrismaService } from '../prisma/prisma.service';
import { PlanService } from './plan.service';
export declare class PlanReminderCron {
    private readonly prisma;
    private readonly planService;
    private readonly mailerService;
    private readonly logger;
    constructor(prisma: PrismaService, planService: PlanService, mailerService: MailerService);
    handleDailyReminders(): Promise<void>;
}
