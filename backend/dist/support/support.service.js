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
const plan_service_1 = require("../plan/plan.service");
const deepseek_service_1 = require("./deepseek.service");
let SupportService = SupportService_1 = class SupportService {
    constructor(config, deepSeekService, planService) {
        this.config = config;
        this.deepSeekService = deepSeekService;
        this.planService = planService;
        this.logger = new common_1.Logger(SupportService_1.name);
        this.ipRateLimits = new Map();
    }
    checkRateLimit(ip, maxRequests, windowMs = 3600000) {
        const now = Date.now();
        const record = this.ipRateLimits.get(ip);
        if (!record || now > record.resetAt) {
            this.ipRateLimits.set(ip, { count: 1, resetAt: now + windowMs });
            return;
        }
        if (record.count >= maxRequests) {
            throw new common_1.ForbiddenException('Limite de solicitações de suporte atingido temporariamente para o seu endereço IP. Tente novamente mais tarde.');
        }
        record.count += 1;
    }
    async chatPublic(dto, clientIp = 'unknown') {
        this.checkRateLimit(clientIp, 12, 3600000);
        const historyTurns = dto.history || [];
        const turnNumber = Math.floor(historyTurns.length / 2) + 1;
        if (this.isHumanEscalationRequest(dto.message)) {
            this.notifyTelegramPublicEscalation(clientIp, dto.message).catch((err) => this.logger.warn(`Falha ao disparar alerta de escalada pública no Telegram: ${err}`));
        }
        return this.deepSeekService.generateReply(dto.message, historyTurns, 'PUBLIC_FRONTPAGE', turnNumber);
    }
    async chatAuthenticated(user, dto) {
        const plan = await this.planService.getComputedPlan(user.familyAccountId);
        if (plan.status === 'FREE') {
            return {
                reply: 'Olá! O atendimento interativo em tempo real via IA-ksurim é um benefício exclusivo dos assinantes Premium.\n\nComo usuário do plano gratuito, você pode enviar sua dúvida ou solicitação através do nosso formulário tradicional de suporte que nossa equipe responderá por e-mail com total atenção!',
                quickReplies: [
                    '💎 Conhecer o Plano Premium',
                    '📩 Abrir Formulário de Chamado',
                ],
                isUpsell: true,
            };
        }
        const historyTurns = dto.history || [];
        if (this.isHumanEscalationRequest(dto.message)) {
            this.notifyTelegramHumanEscalation(user.email, plan.status, dto.message, user.familyAccountId).catch((err) => this.logger.warn(`Falha ao disparar alerta de escalada humana no Telegram: ${err}`));
        }
        return this.deepSeekService.generateReply(dto.message, historyTurns, 'AUTHENTICATED_PREMIUM', 1, user.email);
    }
    async sendPublicSupportForm(dto, clientIp = 'unknown') {
        this.checkRateLimit(clientIp, 10, 3600000);
        const botToken = this.config.get('TELEGRAM_SUPPORT_BOT_TOKEN') ||
            this.config.get('TELEGRAM_BOT_TOKEN');
        const chatId = this.config.get('TELEGRAM_SUPPORT_CHAT_ID') ||
            this.config.get('TELEGRAM_CHAT_ID');
        if (!botToken || !chatId) {
            this.logger.error('TELEGRAM_SUPPORT_BOT_TOKEN ou CHAT_ID ausente no .env');
            throw new common_1.ServiceUnavailableException('O canal de suporte está temporariamente indisponível. Tente novamente mais tarde.');
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
            message: 'Sua solicitação foi encaminhada com sucesso ao nosso suporte técnico! Entraremos em contato no e-mail informado.',
        };
    }
    async sendToTelegram(user, dto) {
        const botToken = this.config.get('TELEGRAM_SUPPORT_BOT_TOKEN') ||
            this.config.get('TELEGRAM_BOT_TOKEN');
        const chatId = this.config.get('TELEGRAM_SUPPORT_CHAT_ID') ||
            this.config.get('TELEGRAM_CHAT_ID');
        if (!botToken || !chatId) {
            this.logger.error('TELEGRAM_SUPPORT_BOT_TOKEN ou CHAT_ID ausente no .env');
            throw new common_1.ServiceUnavailableException('O canal de suporte está temporariamente indisponível. Tente novamente mais tarde.');
        }
        const text = this.buildTelegramMessage(user, dto);
        await this.dispatchTelegramMessage(botToken, chatId, text);
        return {
            delivered: true,
            message: 'Mensagem enviada ao suporte com sucesso!',
        };
    }
    async dispatchTelegramMessage(botToken, chatId, text) {
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
        }
        catch (error) {
            if (error instanceof common_1.BadGatewayException ||
                error instanceof common_1.ServiceUnavailableException ||
                error instanceof common_1.ForbiddenException) {
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
    isHumanEscalationRequest(text) {
        const pattern = /\b(atendente|humano|humana|pessoa\s+real|atendimento\s+humano|falar\s+com\s+algu[eé]m|suporte\s+humano|falar\s+com\s+uma\s+pessoa|falar\s+com\s+tendente)\b/i;
        return pattern.test(text);
    }
    async notifyTelegramHumanEscalation(email, planStatus, message, familyAccountId) {
        const botToken = this.config.get('TELEGRAM_SUPPORT_BOT_TOKEN') ||
            this.config.get('TELEGRAM_BOT_TOKEN');
        const chatId = this.config.get('TELEGRAM_SUPPORT_CHAT_ID') ||
            this.config.get('TELEGRAM_CHAT_ID');
        if (!botToken || !chatId)
            return;
        const timestamp = new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            dateStyle: 'short',
            timeStyle: 'short',
        }).format(new Date());
        const text = [
            '🔔 <b>Alerta: Solicitação de Atendente Humano no Chat</b>',
            '',
            `👤 <b>Usuário:</b> ${this.escapeHtml(email)}`,
            `🏷️ <b>Plano:</b> ${this.escapeHtml(planStatus)}`,
            `🏢 <b>Workspace:</b> <code>${this.escapeHtml(familyAccountId)}</code>`,
            `💬 <b>Mensagem:</b> <i>"${this.escapeHtml(message)}"</i>`,
            '',
            `🕒 <b>Horário:</b> ${timestamp} (BRT)`,
            '<i>ℹ️ O usuário solicitou contato humano durante a conversa com a IA-ksurim. O formulário para coleta de WhatsApp foi aberto na tela dele.</i>',
        ].join('\n');
        await this.dispatchTelegramMessage(botToken, chatId, text);
    }
    async notifyTelegramPublicEscalation(clientIp, message) {
        const botToken = this.config.get('TELEGRAM_SUPPORT_BOT_TOKEN') ||
            this.config.get('TELEGRAM_BOT_TOKEN');
        const chatId = this.config.get('TELEGRAM_SUPPORT_CHAT_ID') ||
            this.config.get('TELEGRAM_CHAT_ID');
        if (!botToken || !chatId)
            return;
        const timestamp = new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            dateStyle: 'short',
            timeStyle: 'short',
        }).format(new Date());
        const text = [
            '🔔 <b>Alerta: Visitante Solicitou Atendente na Frontpage</b>',
            '',
            `🌐 <b>IP do Visitante:</b> <code>${this.escapeHtml(clientIp)}</code>`,
            `💬 <b>Mensagem:</b> <i>"${this.escapeHtml(message)}"</i>`,
            '',
            `🕒 <b>Horário:</b> ${timestamp} (BRT)`,
            '<i>ℹ️ O visitante pediu atendimento humano na página pública. O formulário foi disponibilizado.</i>',
        ].join('\n');
        await this.dispatchTelegramMessage(botToken, chatId, text);
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
    __metadata("design:paramtypes", [config_1.ConfigService,
        deepseek_service_1.DeepSeekService,
        plan_service_1.PlanService])
], SupportService);
//# sourceMappingURL=support.service.js.map