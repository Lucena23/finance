import { Module } from '@nestjs/common';

import { SupportController } from './support.controller';
import { SupportService } from './support.service';

/**
 * SupportModule — Suporte ao cliente via Telegram (TAREFA 21).
 * ARCHITECTURE §3.2 — MÓDULO SUPPORT — RN-14.
 *
 * Apenas o backend fala com a API do Telegram, usando as credenciais
 * `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID` do `.env` (RN-14).
 */
@Module({
  controllers: [SupportController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule {}
