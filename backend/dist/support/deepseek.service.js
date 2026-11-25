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
var DeepSeekService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeepSeekService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const SYSTEM_PROMPT_BASE = `Você é a IA-ksurim, a assistente oficial e inteligente de Suporte e Navegação do software Aksurim Controle (https://controle.aksurim.com).

DIRETRIZES FUNDAMENTAIS:
1. IDENTIDADE E TOM:
   - Apresente-se como IA-ksurim (Suporte & Ajuda da Aksurim).
   - Seja cordial, executiva, direta, precisa e didática.
   - Responda em Português do Brasil com excelente clareza.
   - Máximo de 2 a 3 parágrafos curtos por resposta. Seja concisa e termine sempre suas frases com ponto final.

2. ESCOPO PERMITIDO:
   - Dúvidas de uso do sistema: cadastrar despesas (avulsas, parceladas, recorrentes), histórico de pagamentos, relatórios PDF/CSV, categorias, configurações de família.
   - Dúvidas sobre planos e preços:
     * Trial gratuito de 15 dias para novos cadastros (sem precisar de cartão).
     * Plano Free: até 5 categorias, visão do mês atual e próximo.
     * Planos Premium: Mensal R$ 12,95 | Semestral R$ 62,90 (até 2x) | Anual R$ 89,90 (até 3x).
     * Formas de pagamento: Pix instantâneo e Cartão de crédito pelo Mercado Pago com checkout seguro transparente.
     * Garantia legal: Reembolso integral em até 7 dias corridos (Art. 49 do CDC) com autoatendimento.
   - Instalação do PWA:
     * iPhone: Abrir no Safari -> Botão Compartilhar -> "Adicionar à Tela de Início".
     * Android/PC: Tocar no botão "Instalar App" ou no menu do navegador.
   - Problemas de acesso e login: redefinição de senha, erro de e-mail no cadastro.

3. TRAVA INEGOCIÁVEL (GUARDRAIL DE NEGÓCIO):
   - VOCÊ NUNCA FORNECE CONSULTORIA FINANCEIRA, CONSELHOS DE INVESTIMENTOS OU ANÁLISES DE ECONOMIA ("onde cortar gastos", "como juntar dinheiro", "qual ação comprar").
   - Se o usuário perguntar sobre consultoria financeira pessoal, responda polidamente:
     "Como sou a assistente oficial de Suporte e Navegação da plataforma, meu foco é te ajudar a usar todas as ferramentas do Aksurim Controle. Em breve lançaremos um módulo exclusivo de Consultoria Financeira com IA para analisar seus hábitos e sugerir economias!"

4. REGRA DE BOTÕES INTERATIVOS (MUITO IMPORTANTE):
   - NUNCA escreva no corpo do texto listas numéricas do tipo "1) x, 2) y" prometendo opções.
   - Ao final de toda resposta, em uma linha separada, adicione EXATAMENTE a tag de botões com 2 a 3 sugestões curtas de ações que o usuário pode tocar para continuar:
     BOTOES: Sugestão 1 | Sugestão 2 | Sugestão 3
   - O sistema converterá essa linha em botões interativos clicáveis na tela do usuário.`;
let DeepSeekService = DeepSeekService_1 = class DeepSeekService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(DeepSeekService_1.name);
        this.apiUrl =
            this.config.get('DEEPSEEK_API_BASE_URL') ||
                'https://api.deepseek.com/chat/completions';
        this.apiKey = this.config.get('DEEPSEEK_API_KEY');
        this.model = this.config.get('DEEPSEEK_MODEL') || 'deepseek-chat';
    }
    async generateReply(userMessage, history = [], contextType = 'PUBLIC_FRONTPAGE', turnNumber = 1, userName) {
        if (!this.apiKey) {
            this.logger.warn('DEEPSEEK_API_KEY não configurada no .env');
            return this.fallbackResponse(contextType);
        }
        let dynamicSystemPrompt = SYSTEM_PROMPT_BASE;
        if (contextType === 'PUBLIC_FRONTPAGE') {
            dynamicSystemPrompt += `\n\nCONTEXTO: O usuário está na Frontpage (não logado). Este é o turno ${turnNumber} de 4 da conversa.
- Incentive com simpatia a experimentar os 15 dias grátis de Trial.
- Se o usuário perguntar dados pessoais de despesas ou saldo, avise que por segurança bancária ele deve entrar na conta.`;
            if (turnNumber >= 4) {
                dynamicSystemPrompt += `\n- ESTE É O ÚLTIMO TURNO DA VISITA: Conclua calorosamente convidando o usuário a criar a conta gratuita ou fazer login para continuar o atendimento completo.
BOTOES: 🚀 Criar Conta Gratuita | 🔑 Fazer Login | 📩 Abrir Chamado`;
            }
        }
        else {
            dynamicSystemPrompt += `\n\nCONTEXTO: O usuário é um cliente autenticado no plano Premium/Trial${userName ? ` chamado ${userName}` : ''}. Dê suporte prioritário de alta qualidade.`;
        }
        const messages = [
            { role: 'system', content: dynamicSystemPrompt },
            ...history.slice(-4).map((h) => ({
                role: h.role,
                content: h.content,
            })),
            { role: 'user', content: userMessage },
        ];
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: this.model,
                    messages,
                    max_tokens: 500,
                    temperature: 0.3,
                    stream: false,
                }),
            });
            if (!response.ok) {
                const errorDetail = await response.text();
                this.logger.error(`Falha na API DeepSeek (HTTP ${response.status}): ${errorDetail}`);
                return this.fallbackResponse(contextType);
            }
            const data = (await response.json());
            const rawReply = data.choices?.[0]?.message?.content?.trim() ||
                'Olá! Como posso ajudar você com o Aksurim Controle hoje?';
            const parsed = this.parseReplyAndButtons(rawReply);
            const finalButtons = parsed.buttons && parsed.buttons.length > 0
                ? parsed.buttons
                : this.deriveQuickReplies(userMessage, contextType, turnNumber);
            return {
                reply: parsed.cleanText,
                quickReplies: finalButtons,
                isCommercialClose: contextType === 'PUBLIC_FRONTPAGE' && turnNumber >= 4,
            };
        }
        catch (error) {
            this.logger.error(`Erro de conexão com a DeepSeek API: ${error instanceof Error ? error.message : String(error)}`);
            return this.fallbackResponse(contextType);
        }
    }
    parseReplyAndButtons(text) {
        const match = text.match(/(?:^|\n)BOTOES:\s*(.+)$/i);
        if (!match) {
            return { cleanText: text };
        }
        const cleanText = text.replace(/(?:^|\n)BOTOES:\s*(.+)$/i, '').trim();
        const buttons = match[1]
            .split('|')
            .map((b) => b.trim())
            .filter((b) => b.length > 0 && b.length < 40);
        return { cleanText, buttons };
    }
    deriveQuickReplies(userMessage, contextType, turnNumber) {
        if (contextType === 'PUBLIC_FRONTPAGE') {
            if (turnNumber >= 4) {
                return ['🚀 Criar Conta Gratuita', '🔑 Fazer Login', '📩 Abrir Chamado'];
            }
            const lower = userMessage.toLowerCase();
            if (lower.includes('plano') || lower.includes('preço') || lower.includes('valor')) {
                return ['🚀 Testar 15 Dias Grátis', '💳 Formas de Pagamento', '📱 Como Instalar'];
            }
            if (lower.includes('senha') || lower.includes('email') || lower.includes('entrar')) {
                return ['🔑 Esqueci Minha Senha', '✉️ Errei Meu E-mail', '📩 Falar com Suporte'];
            }
            return ['💎 Ver Planos e Preços', '📱 Como Funciona o App', '🚀 Começar Teste Grátis'];
        }
        return ['📊 Dúvida sobre Relatórios', '💳 Meu Plano Premium', '📩 Falar com Especialista'];
    }
    fallbackResponse(contextType) {
        if (contextType === 'PUBLIC_FRONTPAGE') {
            return {
                reply: 'Olá! Bem-vindo ao Aksurim Controle. Posso te ajudar com dúvidas sobre nossos planos, funcionalidades ou acesso. Se preferir, você também pode abrir um chamado direto com nossa equipe.',
                quickReplies: ['💎 Conhecer Planos', '🚀 Testar 15 Dias Grátis', '📩 Abrir Chamado'],
            };
        }
        return {
            reply: 'Olá! Sou a IA-ksurim. Estou pronta para te orientar em qualquer funcionalidade do sistema. Se precisar de uma tratativa especial, deixe sua mensagem que encaminharemos ao especialista.',
            quickReplies: ['📊 Dúvidas no Painel', '💳 Gestão de Assinatura', '📩 Abrir Chamado'],
        };
    }
};
exports.DeepSeekService = DeepSeekService;
exports.DeepSeekService = DeepSeekService = DeepSeekService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], DeepSeekService);
//# sourceMappingURL=deepseek.service.js.map