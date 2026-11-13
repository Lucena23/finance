import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';
import { PushSubscription } from '@prisma/client';

import { AuthenticatedUser } from '../auth/jwt.strategy';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  AnnouncementService,
  NotificationPreferences,
  SystemAnnouncement,
} from './announcement.service';
import { SubscribePushDto } from './dto/subscribe-push.dto';
import { UnsubscribePushDto } from './dto/unsubscribe-push.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-preferences.dto';
import { NotificationService } from './notification.service';

/**
 * NotificationController — Web Push (subscribe/unsubscribe), preferências e comunicados.
 * ARCHITECTURE §3.2 — MÓDULO NOTIFICATIONS — TAREFA 31 / v1.3.1.
 *
 * O userId é SEMPRE derivado do JWT via @CurrentUser() (RN-01 / §8.3) —
 * nunca aceito como parâmetro de query/body.
 * Acessível a ADMIN e MEMBER (RN-03).
 */
@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly announcementService: AnnouncementService,
  ) {}

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

  /**
   * Obtém as preferências de notificação do usuário (v1.3.1).
   */
  @Get('preferences')
  getPreferences(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NotificationPreferences> {
    return this.announcementService.getPreferences(user.userId);
  }

  /**
   * Atualiza as preferências de notificação do usuário (v1.3.1).
   */
  @Patch('preferences')
  updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferences> {
    return this.announcementService.updatePreferences(user.userId, dto);
  }

  /**
   * Retorna o último comunicado oficial do sistema para exibição no app (v1.3.1).
   */
  @Get('announcements/latest')
  getLatestAnnouncement(): Promise<SystemAnnouncement | null> {
    return this.announcementService.getLatest();
  }
}
