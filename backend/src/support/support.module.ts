import { Module } from '@nestjs/common';

import { PlanModule } from '../plan/plan.module';
import { DeepSeekService } from './deepseek.service';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';

/**
 * SupportModule — Suporte ao cliente, Telegram e IA-ksurim (v1.4.0).
 */
@Module({
  imports: [PlanModule],
  controllers: [SupportController],
  providers: [SupportService, DeepSeekService],
  exports: [SupportService, DeepSeekService],
})
export class SupportModule {}
