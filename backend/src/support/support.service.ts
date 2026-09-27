import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuthenticatedUser } from '../auth/jwt.strategy';
import { CreateSupportMessageDto } from './dto/create-support-message.dto';

/**
 * Resposta pública do endpoint de suporte.
 */
export interface SupportMessageResult {
  /** Indica que a mensagem foi aceita e encaminhada ao Telegram. */
  delivered: boolean;
  /** Mensagem amigável para exibição no frontend. */
  message: string;
}

/**
 * SupportService — encaminha mensagens de suporte ao Telegram (TAREFA 21).
 * ARCHITECTURE §3.2 — MÓDULO SUPPORT — RN-14.
 *
 * REGRA RN-14: APENAS o backend fala com a API do Telegram. As credenciais
 * (`TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID`) residem exclusivamente no `.env`
 * do diretório privado do backend e NUNCA são expostas ao frontend.
 *
 * O `familyAccountId` e os dados do remetente são derivados exclusivamente do
 * JWT autenticado (RN-01 / §8.3) — nunca aceitos como parâmetro do cliente.
 */
@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Envia a mensagem de suporte para o chat do Telegram da Aksurim.
   *
   * @param user Usuário autenticado (derivado do JWT).
   * @param dto  Conteúdo validado do formulário de suporte.
   */
  async sendToTelegram(
    user: AuthenticatedUser,
    dto: CreateSupportMessageDto,
  ): Promise<SupportMessageResult> {
    const botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    const chatId = this.config.get<string>('TELEGRAM_CHAT_ID');

    if (!botToken || !chatId) {
      this.logger.error(
        'TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID ausente no .env — suporte indisponível.',
      );
      throw new ServiceUnavailableException(
        'O canal de suporte está temporariamente indisponível. Tente novamente mais tarde.',
      );
    }

    const text = this.buildTelegramMessage(user, dto);
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

      return {
        delivered: true,
        message: 'Mensagem enviada ao suporte com sucesso!',
      };
    } catch (error) {
      if (
        error instanceof BadGatewayException ||
        error instanceof ServiceUnavailableException
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

  /**
   * Monta o texto da mensagem enviada ao Telegram, enriquecido com os dados
   * do remetente derivados do JWT (RN-14 / §8.3).
   */
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
      '🆘 <b>Novo chamado de Suporte — Finanças Aksurim</b>',
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

  /**
   * Escapa caracteres reservados do HTML aceito pelo Telegram (parse_mode HTML).
   */
  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
