import {
  BadGatewayException,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuthenticatedUser } from '../auth/jwt.strategy';
import { PlanService } from '../plan/plan.service';
import { DeepSeekService, IaKsurimChatResponse } from './deepseek.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { CreateSupportMessageDto } from './dto/create-support-message.dto';
import { PublicSupportFormDto } from './dto/public-support-form.dto';

export interface SupportMessageResult {
  delivered: boolean;
  message: string;
}

export interface SupportChatResult extends IaKsurimChatResponse {
  isUpsell?: boolean;
}

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);
  private readonly ipRateLimits = new Map<string, RateLimitRecord>();

  constructor(
    private readonly config: ConfigService,
    private readonly deepSeekService: DeepSeekService,
    private readonly planService: PlanService,
  ) {}

  private checkRateLimit(ip: string, maxRequests: number, windowMs = 3600000): void {
    const now = Date.now();
    const record = this.ipRateLimits.get(ip);

    if (!record || now > record.resetAt) {
      this.ipRateLimits.set(ip, { count: 1, resetAt: now + windowMs });
      return;
    }

    if (record.count >= maxRequests) {
      throw new ForbiddenException(
        'Limite de solicitações de suporte atingido temporariamente para o seu endereço IP. Tente novamente mais tarde.',
      );
    }

    record.count += 1;
  }

  /**
   * Chat público com a IA-ksurim na Frontpage (não logados).
   */
  async chatPublic(
    dto: ChatMessageDto,
    clientIp = 'unknown',
  ): Promise<SupportChatResult> {
    this.checkRateLimit(clientIp, 12, 3600000);

    const historyTurns = dto.history || [];
    // Cada turno do usuário tem 1 pergunta + 1 resposta (2 mensagens no histórico)
    const turnNumber = Math.floor(historyTurns.length / 2) + 1;

    return this.deepSeekService.generateReply(
      dto.message,
      historyTurns,
      'PUBLIC_FRONTPAGE',
      turnNumber,
    );
  }

  /**
   * Chat autenticado com a IA-ksurim dentro da plataforma.
   */
  async chatAuthenticated(
    user: AuthenticatedUser,
    dto: ChatMessageDto,
  ): Promise<SupportChatResult> {
    const plan = await this.planService.getComputedPlan(user.familyAccountId);

    if (plan.status === 'FREE') {
      return {
        reply:
          'Olá! O atendimento interativo em tempo real via IA-ksurim é um benefício exclusivo dos assinantes Premium.\n\nComo usuário do plano gratuito, você pode enviar sua dúvida ou solicitação através do nosso formulário tradicional de suporte que nossa equipe responderá por e-mail com total atenção!',
        quickReplies: [
          '💎 Conhecer o Plano Premium',
          '📩 Abrir Formulário de Chamado',
        ],
        isUpsell: true,
      };
    }

    const historyTurns = dto.history || [];
    return this.deepSeekService.generateReply(
      dto.message,
      historyTurns,
      'AUTHENTICATED_PREMIUM',
      1,
      user.email,
    );
  }

  /**
   * Formulário formal público (recuperação de acesso / erro de e-mail).
   */
  async sendPublicSupportForm(
    dto: PublicSupportFormDto,
    clientIp = 'unknown',
  ): Promise<SupportMessageResult> {
    this.checkRateLimit(clientIp, 4, 3600000);

    const botToken =
      this.config.get<string>('TELEGRAM_SUPPORT_BOT_TOKEN') ||
      this.config.get<string>('TELEGRAM_BOT_TOKEN');
    const chatId =
      this.config.get<string>('TELEGRAM_SUPPORT_CHAT_ID') ||
      this.config.get<string>('TELEGRAM_CHAT_ID');

    if (!botToken || !chatId) {
      this.logger.error('TELEGRAM_SUPPORT_BOT_TOKEN ou CHAT_ID ausente no .env');
      throw new ServiceUnavailableException(
        'O canal de suporte está temporariamente indisponível. Tente novamente mais tarde.',
      );
    }

    const timestamp = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    const text = [
      '🌐 <b>Novo Chamado Público de Suporte — Frontpage</b>',
      '',
      `<b>Nome:</b> ${this.escapeHtml(dto.name)}`,
      `<b>E-mail:</b> ${this.escapeHtml(dto.email)}`,
      dto.contact ? `<b>Contato:</b> ${this.escapeHtml(dto.contact)}` : '',
      `<b>Assunto:</b> ${this.escapeHtml(dto.subject)}`,
      '',
      `<b>Mensagem:</b>\n${this.escapeHtml(dto.message)}`,
      '',
      `<b>Data/Hora:</b> ${timestamp} (BRT)`,
      `<b>IP do Visitante:</b> <code>${this.escapeHtml(clientIp)}</code>`,
    ]
      .filter(Boolean)
      .join('\n');

    await this.dispatchTelegramMessage(botToken, chatId, text);

    return {
      delivered: true,
      message:
        'Sua solicitação foi encaminhada com sucesso ao nosso suporte técnico! Entraremos em contato no e-mail informado.',
    };
  }

  /**
   * Formulário formal autenticado na área logada.
   */
  async sendToTelegram(
    user: AuthenticatedUser,
    dto: CreateSupportMessageDto,
  ): Promise<SupportMessageResult> {
    const botToken =
      this.config.get<string>('TELEGRAM_SUPPORT_BOT_TOKEN') ||
      this.config.get<string>('TELEGRAM_BOT_TOKEN');
    const chatId =
      this.config.get<string>('TELEGRAM_SUPPORT_CHAT_ID') ||
      this.config.get<string>('TELEGRAM_CHAT_ID');

    if (!botToken || !chatId) {
      this.logger.error('TELEGRAM_SUPPORT_BOT_TOKEN ou CHAT_ID ausente no .env');
      throw new ServiceUnavailableException(
        'O canal de suporte está temporariamente indisponível. Tente novamente mais tarde.',
      );
    }

    const text = this.buildTelegramMessage(user, dto);
    await this.dispatchTelegramMessage(botToken, chatId, text);

    return {
      delivered: true,
      message: 'Mensagem enviada ao suporte com sucesso!',
    };
  }

  private async dispatchTelegramMessage(
    botToken: string,
    chatId: string,
    text: string,
  ): Promise<void> {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      });

      if (!response.ok) {
        const detail = await response.text();
        this.logger.error(
          `Falha ao enviar mensagem ao Telegram (HTTP ${response.status}): ${detail}`,
        );
        throw new BadGatewayException(
          'Não foi possível encaminhar sua mensagem ao suporte. Tente novamente.',
        );
      }
    } catch (error) {
      if (
        error instanceof BadGatewayException ||
        error instanceof ServiceUnavailableException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(
        `Erro de rede ao contatar a API do Telegram: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new BadGatewayException(
        'Não foi possível encaminhar sua mensagem ao suporte. Tente novamente.',
      );
    }
  }

  private buildTelegramMessage(
    user: AuthenticatedUser,
    dto: CreateSupportMessageDto,
  ): string {
    const contact = dto.contact?.trim() || user.email;
    const timestamp = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    return [
      '🆘 <b>Novo chamado de Suporte — Aksurim Controle</b>',
      '',
      `<b>Assunto:</b> ${this.escapeHtml(dto.subject)}`,
      `<b>Mensagem:</b> ${this.escapeHtml(dto.message)}`,
      '',
      '👤 <b>Remetente</b>',
      `<b>E-mail:</b> ${this.escapeHtml(user.email)}`,
      `<b>Contato informado:</b> ${this.escapeHtml(contact)}`,
      `<b>Workspace:</b> <code>${this.escapeHtml(user.familyAccountId)}</code>`,
      `<b>Data/Hora:</b> ${timestamp} (BRT)`,
    ].join('\n');
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
