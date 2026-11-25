import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface DeepSeekChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface IaKsurimChatResponse {
  reply: string;
  quickReplies?: string[];
  isCommercialClose?: boolean;
}

const SYSTEM_PROMPT_BASE = `Você é a IA-ksurim, a assistente oficial e inteligente de Suporte e Navegação do software Aksurim Controle (https://controle.aksurim.com).

DIRETRIZES FUNDAMENTAIS:
1. IDENTIDADE E TOM:
   - Apresente-se como IA-ksurim (Suporte & Ajuda da Aksurim).
   - Seja cordial, executiva, direta, precisa e didática.
   - Responda em Português do Brasil com excelente clareza.
   - Máximo de 2 a 3 parágrafos curtos por resposta. Seja concisa e evite respostas prolixas.

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

4. SUGESTÕES DE AÇÃO:
   - Sempre que fizer sentido, sugira 2 ou 3 ações rápidas e curtas para o usuário dar o próximo passo.`;

@Injectable()
export class DeepSeekService {
  private readonly logger = new Logger(DeepSeekService.name);
  private readonly apiUrl: string;
  private readonly apiKey?: string;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    this.apiUrl =
      this.config.get<string>('DEEPSEEK_API_BASE_URL') ||
      'https://api.deepseek.com/chat/completions';
    this.apiKey = this.config.get<string>('DEEPSEEK_API_KEY');
    this.model = this.config.get<string>('DEEPSEEK_MODEL') || 'deepseek-chat';
  }

  /**
   * Envia o diálogo para a API da DeepSeek e retorna a resposta formatada da IA-ksurim.
   */
  async generateReply(
    userMessage: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
    contextType: 'PUBLIC_FRONTPAGE' | 'AUTHENTICATED_PREMIUM' = 'PUBLIC_FRONTPAGE',
    turnNumber = 1,
    userName?: string,
  ): Promise<IaKsurimChatResponse> {
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
        dynamicSystemPrompt += `\n- ESTE É O ÚLTIMO TURNO DA VISITA: Conclua calorosamente convidando o usuário a criar a conta gratuita ou fazer login para continuar o atendimento completo.`;
      }
    } else {
      dynamicSystemPrompt += `\n\nCONTEXTO: O usuário é um cliente autenticado no plano Premium/Trial${
        userName ? ` chamado ${userName}` : ''
      }. Dê suporte prioritário de alta qualidade.`;
    }

    const messages: DeepSeekChatMessage[] = [
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
          max_tokens: 220,
          temperature: 0.3,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorDetail = await response.text();
        this.logger.error(
          `Falha na API DeepSeek (HTTP ${response.status}): ${errorDetail}`,
        );
        return this.fallbackResponse(contextType);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const replyContent =
        data.choices?.[0]?.message?.content?.trim() ||
        'Olá! Como posso ajudar você com o Aksurim Controle hoje?';

      return {
        reply: replyContent,
        quickReplies: this.deriveQuickReplies(userMessage, contextType, turnNumber),
        isCommercialClose: contextType === 'PUBLIC_FRONTPAGE' && turnNumber >= 4,
      };
    } catch (error) {
      this.logger.error(
        `Erro de conexão com a DeepSeek API: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return this.fallbackResponse(contextType);
    }
  }

  private deriveQuickReplies(
    userMessage: string,
    contextType: 'PUBLIC_FRONTPAGE' | 'AUTHENTICATED_PREMIUM',
    turnNumber: number,
  ): string[] {
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

  private fallbackResponse(
    contextType: 'PUBLIC_FRONTPAGE' | 'AUTHENTICATED_PREMIUM',
  ): IaKsurimChatResponse {
    if (contextType === 'PUBLIC_FRONTPAGE') {
      return {
        reply:
          'Olá! Bem-vindo ao Aksurim Controle. Posso te ajudar com dúvidas sobre nossos planos, funcionalidades ou acesso. Se preferir, você também pode abrir um chamado direto com nossa equipe.',
        quickReplies: ['💎 Conhecer Planos', '🚀 Testar 15 Dias Grátis', '📩 Abrir Chamado'],
      };
    }
    return {
      reply:
        'Olá! Sou a IA-ksurim. Estou pronta para te orientar em qualquer funcionalidade do sistema. Se precisar de uma tratativa especial, deixe sua mensagem que encaminharemos ao especialista.',
      quickReplies: ['📊 Dúvidas no Painel', '💳 Gestão de Assinatura', '📩 Abrir Chamado'],
    };
  }
}
