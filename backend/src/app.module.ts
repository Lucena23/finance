import { join } from 'node:path';

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';

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
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Resolve o .env relativo à raiz do backend, independente do cwd.
      envFilePath: join(__dirname, '..', '.env'),
    }),
    // Agendador de tarefas — habilita o Cron Job de Web Push (TAREFA 33).
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UserModule,
    FamilyAccountModule,
    CategoryModule,
    ExpenseModule,
    PaymentItemModule,
    DashboardModule,
    NotificationModule,
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
