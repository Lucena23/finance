"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SupportService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let SupportService = SupportService_1 = class SupportService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(SupportService_1.name);
    }
    async sendToTelegram(user, dto) {
        const botToken = this.config.get('TELEGRAM_BOT_TOKEN');
        const chatId = this.config.get('TELEGRAM_CHAT_ID');
        if (!botToken || !chatId) {
            this.logger.error('TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID ausente no .env — suporte indisponível.');
            throw new common_1.ServiceUnavailableException('O canal de suporte está temporariamente indisponível. Tente novamente mais tarde.');
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
                this.logger.error(`Falha ao enviar mensagem ao Telegram (HTTP ${response.status}): ${detail}`);
                throw new common_1.BadGatewayException('Não foi possível encaminhar sua mensagem ao suporte. Tente novamente.');
            }
            return {
                delivered: true,
                message: 'Mensagem enviada ao suporte com sucesso!',
            };
        }
        catch (error) {
            if (error instanceof common_1.BadGatewayException ||
                error instanceof common_1.ServiceUnavailableException) {
                throw error;
            }
            this.logger.error(`Erro de rede ao contatar a API do Telegram: ${error instanceof Error ? error.message : String(error)}`);
            throw new common_1.BadGatewayException('Não foi possível encaminhar sua mensagem ao suporte. Tente novamente.');
        }
    }
    buildTelegramMessage(user, dto) {
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
    escapeHtml(value) {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
};
exports.SupportService = SupportService;
exports.SupportService = SupportService = SupportService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], SupportService);
//# sourceMappingURL=support.service.js.map