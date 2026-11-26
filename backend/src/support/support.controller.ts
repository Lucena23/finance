import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { AuthenticatedUser } from '../auth/jwt.strategy';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ChatMessageDto } from './dto/chat-message.dto';
import { CreateSupportMessageDto } from './dto/create-support-message.dto';
import { PublicSupportFormDto } from './dto/public-support-form.dto';
import {
  SupportChatResult,
  SupportMessageResult,
  SupportService,
} from './support.service';

/**
 * SupportController — Suporte ao cliente e IA-ksurim (v1.4.0).
 */
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  /**
   * Chat público com a IA-ksurim na frontpage (Landing Page / Login).
   */
  @Public()
  @Post('public/chat')
  @HttpCode(HttpStatus.OK)
  chatPublic(
    @Body() dto: ChatMessageDto,
    @Req() req: Request,
  ): Promise<SupportChatResult> {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown';
    return this.supportService.chatPublic(dto, ip);
  }

  /**
   * Formulário formal de chamado público para quem não consegue logar.
   */
  @Public()
  @Post('public/form')
  @HttpCode(HttpStatus.OK)
  sendPublicForm(
    @Body() dto: PublicSupportFormDto,
    @Req() req: Request,
  ): Promise<SupportMessageResult> {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown';
    return this.supportService.sendPublicSupportForm(dto, ip);
  }

  /**
   * Chat autenticado com a IA-ksurim para usuários logados (Premium / Trial).
   */
  @Post('chat')
  @HttpCode(HttpStatus.OK)
  chatAuthenticated(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChatMessageDto,
  ): Promise<SupportChatResult> {
    return this.supportService.chatAuthenticated(user, dto);
  }

  /**
   * Encaminha uma mensagem do formulário de suporte autenticado ao Telegram da Aksurim.
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
