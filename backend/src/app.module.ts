import { join } from 'node:path';

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { MailerModule } from '@nestjs-modules/mailer';

import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { CategoryModule } from './category/category.module';
import { FamilyScopeInterceptor } from './common/interceptors/family-scope.interceptor';
import { RolesGuard } from './common/guards/roles.guard';
import { DashboardModule } from './dashboard/dashboard.module';
import { ExpenseModule } from './expense/expense.module';
import { FamilyAccountModule } from './family-account/family-account.module';
import { NotificationModule } from './notification/notification.module';
import { PaymentItemModule } from './payment-item/payment-item.module';
import { PrismaModule } from './prisma/prisma.module';
import { SupportModule } from './support/support.module';
import { UserModule } from './user/user.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Resolve o .env relativo à raiz do backend, independente do cwd.
      envFilePath: join(__dirname, '..', '.env'),
    }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => {
        const port = Number(config.get('SMTP_PORT')) || 587;
        return {
          transport: {
            host: config.get('SMTP_HOST') || 'mail.aksurim.com',
            port,
            secure: port === 465, // true para 465, false para outras (587, 25)
            auth: {
              user: config.get('SMTP_USER') || 'nao-responda@aksurim.com',
              pass: config.get('SMTP_PASS'),
            },
          },
          defaults: {
            from: '"Finanças Aksurim" <nao-responda@aksurim.com>',
          },
        };
      },
      inject: [ConfigService],
    }),
    // Agendador de tarefas — habilita o Cron Job de Web Push (TAREFA 33).
    ScheduleModule.forRoot(),
    ReportsModule,
    PrismaModule,
    AuthModule,
    UserModule,
    FamilyAccountModule,
    CategoryModule,
    ExpenseModule,
    PaymentItemModule,
    DashboardModule,
    NotificationModule,
    // Suporte ao cliente via Telegram (TAREFA 21 / RN-14).
    SupportModule,
    // Painel Aksurim — Admin Global cross-tenant (TAREFA 25 / RN-15).
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Guard global de autenticação (TAREFA 11) — exceto rotas @Public().
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Guard global de papéis (TAREFA 12) — aplicado após a autenticação.
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    // Interceptor global de isolamento multi-tenant (TAREFA 13).
    // Deriva o familyAccountId do JWT e o injeta como escopo obrigatório.
    {
      provide: APP_INTERCEPTOR,
      useClass: FamilyScopeInterceptor,
    },
  ],
})
export class AppModule {}
