import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { AuthenticatedUser } from '../auth/jwt.strategy';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateSupportMessageDto } from './dto/create-support-message.dto';
import {
  SupportMessageResult,
  SupportService,
} from './support.service';

/**
 * SupportController — Suporte ao cliente via Telegram (TAREFA 21).
 * ARCHITECTURE §3.2 — MÓDULO SUPPORT — RN-14.
 *
 * Endpoint: POST /api/v1/support
 * Apenas o backend fala com a API do Telegram (RN-14). O remetente é derivado
 * exclusivamente do JWT (RN-01 / §8.3) — nunca aceito no body.
 */
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  /**
   * Encaminha uma mensagem do formulário de suporte ao Telegram da Aksurim.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  send(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSupportMessageDto,
  ): Promise<SupportMessageResult> {
    return this.supportService.sendToTelegram(user, dto);
  }
}
