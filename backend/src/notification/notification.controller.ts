import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { PushSubscription } from '@prisma/client';

import { AuthenticatedUser } from '../auth/jwt.strategy';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SubscribePushDto } from './dto/subscribe-push.dto';
import { UnsubscribePushDto } from './dto/unsubscribe-push.dto';
import { NotificationService } from './notification.service';

/**
 * NotificationController — Web Push (subscribe/unsubscribe).
 * ARCHITECTURE §3.2 — MÓDULO NOTIFICATIONS — TAREFA 31.
 *
 * O userId é SEMPRE derivado do JWT via @CurrentUser() (RN-01 / §8.3) —
 * nunca aceito como parâmetro de query/body.
 * Acessível a ADMIN e MEMBER (RN-03).
 */
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Registra a subscription de Web Push do navegador do usuário autenticado.
   * Idempotente: subscription duplicada atualiza as chaves sem erro.
   */
  @Post('subscribe')
  @HttpCode(HttpStatus.CREATED)
  subscribe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubscribePushDto,
  ): Promise<PushSubscription> {
    return this.notificationService.subscribe(user.userId, dto);
  }

  /**
   * Remove a subscription de Web Push do usuário autenticado pelo endpoint.
   */
  @Delete('subscribe')
  @HttpCode(HttpStatus.NO_CONTENT)
  unsubscribe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UnsubscribePushDto,
  ): Promise<void> {
    return this.notificationService.unsubscribe(user.userId, dto);
  }
}
