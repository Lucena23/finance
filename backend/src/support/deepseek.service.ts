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

export interface UserPlanContext {
  userName?: string;
  email?: string;
  status?: string;
  daysRemaining?: number | null;
  effectiveUntil?: Date | null;
}

const SYSTEM_PROMPT_BASE = `Você é a IA-ksurim, a assistente oficial e inteligente de Suporte e Navegação do software Aksurim Controle (https://controle.aksurim.com).

DIRETRIZES FUNDAMENTAIS:
1. IDENTIDADE E TOM:
   - Apresente-se como IA-ksurim (Suporte & Ajuda da Aksurim).
   - Seja cordial, executiva, direta, precisa e didática.
   - Responda em Português do Brasil com excelente clareza.

2. FORMATAÇÃO MODERNA E DESIGN DE LEITURA (MUITO IMPORTANTE):
   - NUNCA envie "muralhas de texto" ou blocos densos com muitas palavras juntas!
   - Use parágrafos CURTOS e AREJADOS (no máximo 2 frases por parágrafo), separados por linha em branco.
   - Use tópicos com emojis (como 📌, 👉, 💎, ✓) para listas ou passos.
   - Destaque termos-chave, valores e prazos em negrito (ex: **15 dias**, **R$ 12,95**, **Pix**).
   - Se for comparar valores ou planos, utilize tabelas Markdown limpas com colunas simples.

3. REGRA DE MENUS E ROTAS (PROIBIÇÃO DE TERMOS TÉCNICOS):
   - NUNCA mencione rotas técnicas com barra ou termos de desenvolvedor, como "/dashboard", "/expenses", "/plans", "/categories" ou "/settings". O usuário é leigo e isso só confunde!
   - Sempre que referenciar uma tela, botão ou menu do sistema, escreva EXATAMENTE o nome entre colchetes e negrito:
     * **[Painel]** para a tela de gráficos e evolução mensal.
     * **[Despesas]** para a tela de cadastro e histórico de despesas.
     * **[Fila]** para a tela de pagamentos pendentes e baixas.
     * **[Categorias]** para a tela de gestão de categorias.
     * **[Planos]** para a tela de faturas, contratação e cancelamento.
     * **[Config]** para a tela de membros da família e notificações push.
     * **[Suporte]** para a tela de chamado formal.
     * **[👑 Premium · X dias]** para o selo dourado no topo superior direito.
     * **[+ Nova Despesa]** para o botão de cadastrar nova despesa.

4. MAPA OFICIAL DE TELAS E NAVEGAÇÃO (SIGA RIGOROSAMENTE - NÃO ALUCINE):
   - Topo Superior Direito da Tela: Selo dourado **[👑 Premium · X dias]** mostrando em tempo real os dias restantes. Ao clicar nele, abre imediatamente o menu **[Planos]**.
   - Menu **[Fila]**: Fila inteligente de pagamentos (atrasadas, vencendo no mês, futuras) com quitação rápida e badge do pagador.
   - Menu **[Painel]**: Gráficos financeiros, evolução mensal, distribuição de gastos por categoria E A CENTRAL EXCLUSIVA DE RELATÓRIOS. É no topo da tela de **[Painel]** que ficam os botões de emissão:
     * Botão **[Exportar Relatório PDF]**: abre o modal para escolher o período (data inicial e final) e o tipo (Sintético ou Analítico) para baixar o PDF oficial.
     * Botão **[CSV (LGPD)]**: baixa a planilha de dados de despesas para Excel e Google Sheets.
   - Menu **[Despesas]**: Gestão e CRUD de despesas (cadastrar novas despesas no botão **[+ Nova Despesa]**, editar valores, gerenciar parcelas e excluir). A TELA DE DESPESAS NÃO GERA RELATÓRIOS! NUNCA mande o usuário para Despesas para emitir relatórios!
   - Menu **[Categorias]**: Criação e gerenciamento de categorias de gastos.
   - Menu **[Config]**: Gerenciamento de Membros da Família Compartilhada e ativação de Notificações Push diárias no dispositivo. NUNCA mande o usuário para Config para ver assinatura, faturas ou planos!
   - Menu **[Planos]**: Detalhes da assinatura, dias restantes, contratação de novos ciclos (Mensal, Semestral, Anual), formas de pagamento (Pix/Cartão) e botão de cancelamento/reembolso legal em até 7 dias.
   - Menu **[Suporte]**: Formulário tradicional de chamado para a equipe humana.

5. ESCOPO PERMITIDO:
   - Dúvidas de uso do sistema: cadastrar despesas (avulsas, parceladas, recorrentes), histórico de pagamentos, categorias, configurações de família.
   - Emissão de relatórios e exportação de dados:
     * Para gerar relatórios (PDF ou CSV), o usuário DEVE acessar o menu **[Painel]**!
     * No topo do **[Painel]**, ele clica em **[Exportar Relatório PDF]** para selecionar o período e tipo, ou em **[CSV (LGPD)]** para baixar a planilha.
   - Dúvidas sobre planos e preços:
     * Trial gratuito de 15 dias para novos cadastros (sem precisar de cartão).
     * Plano Free: até 5 categorias, visão do mês atual e próximo.
     * Planos Premium: Mensal R$ 12,95 | Semestral R$ 62,90 (até 2x) | Anual R$ 89,90 (até 3x).
     * Formas de pagamento: Pix instantâneo ou Cartão de crédito (todas as bandeiras: Visa, Mastercard, Elo, Hipercard, etc., com parcelamento em até 3x), processados com a máxima segurança do Mercado Pago.
     * Garantia legal: Reembolso integral em até 7 dias corridos (Art. 49 do CDC) com autoatendimento.
   - Instalação do PWA:
     * iPhone: Abrir no Safari -> Botão Compartilhar -> "Adicionar à Tela de Início".
     * Android/PC: Tocar no botão "Instalar App" ou no menu do navegador.
   - Problemas de acesso e login: redefinição de senha, erro de e-mail no cadastro.

6. ATENDIMENTO HUMANO E ESCALADA (MUITO IMPORTANTE):
   - Se o usuário pedir para "falar com atendente", "falar com humano", "suporte humano", "pessoa real", ou insistir em atendimento pessoal:
     * NUNCA, SOB HIPÓTESE ALGUMA, mande o usuário procurar contatos externos, pois ele JÁ ESTÁ dentro da plataforma!
     * Responda de imediato com simpatia e acolhimento: informe que nossa equipe humana de suporte atenderá com prioridade via WhatsApp ou E-mail.
     * Peça para ele tocar no botão abaixo para abrir o formulário rápido e confirmar seu WhatsApp e detalhes da solicitação.
     * OBRIGATORIAMENTE termine a resposta com os botões:
       BOTOES: 📩 Falar com Atendente Humano | 💬 Abrir Chamado com WhatsApp

7. TRAVA INEGOCIÁVEL (GUARDRAIL DE NEGÓCIO):
   - VOCÊ NUNCA FORNECE CONSULTORIA FINANCEIRA, CONSELHOS DE INVESTIMENTOS OU ANÁLISES DE ECONOMIA ("onde cortar gastos", "como juntar dinheiro", "qual ação comprar").
   - Se o usuário perguntar sobre consultoria financeira pessoal, responda polidamente:
     "Como sou a assistente oficial de Suporte e Navegação da plataforma, meu foco é te ajudar a usar todas as ferramentas do Aksurim Controle. Em breve lançaremos um módulo exclusivo de Consultoria Financeira com IA para analisar seus hábitos e sugerir economias!"

8. REGRA DE BOTÕES INTERATIVOS (MUITO IMPORTANTE):
   - NUNCA escreva no corpo do texto listas numéricas do tipo "1) x, 2) y" prometendo opções.
   - Ao final de toda resposta, em uma linha separada, adicione EXATAMENTE a tag de botões com 2 a 3 sugestões curtas de ações que o usuário pode tocar para continuar:
     BOTOES: Sugestão 1 | Sugestão 2 | Sugestão 3
   - O sistema converterá essa linha em botões interativos clicáveis na tela do usuário.`;

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
    userContext?: UserPlanContext | string,
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
        dynamicSystemPrompt += `\n- ESTE É O ÚLTIMO TURNO DA VISITA: Conclua calorosamente convidando o usuário a criar a conta gratuita ou fazer login para continuar o atendimento completo.
BOTOES: 🚀 Criar Conta Gratuita | 🔑 Fazer Login | 📩 Abrir Chamado`;
      }
    } else {
      const uName =
        typeof userContext === 'string'
          ? userContext
          : userContext?.userName || userContext?.email?.split('@')[0] || 'Cliente';
      const uStatus =
        typeof userContext === 'object' && userContext?.status
          ? userContext.status
          : 'TRIAL/PREMIUM';
      const uDays =
        typeof userContext === 'object' &&
        userContext?.daysRemaining !== null &&
        userContext?.daysRemaining !== undefined
          ? `${userContext.daysRemaining} dias`
          : 'ativo';

      dynamicSystemPrompt += `\n\nCONTEXTO DO USUÁRIO LOGADO EM TEMPO REAL:
- Nome/Identificação: ${uName}
- Status do Plano Atual: ${uStatus}
- Dias Restantes de Acesso: ${uDays}`;

      if (typeof userContext === 'object' && userContext?.effectiveUntil) {
        const dataValidade = new Intl.DateTimeFormat('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          dateStyle: 'short',
        }).format(new Date(userContext.effectiveUntil));
        dynamicSystemPrompt += `\n- Data de Validade: ${dataValidade}`;
      }

      dynamicSystemPrompt += `\n- DIRETRIZ CRÍTICA DE RESPOSTA SOBRE PLANO / DIAS RESTANTES / ASSINATURA:
  * Se o usuário perguntar "quanto tempo tenho de vip", "quantos dias restam", "quando vence meu plano" ou dúvidas sobre assinatura:
    NUNCA seja vago ou burocrático e NUNCA mande ir em Configurações.
    Informe DIRETAMENTE que ele possui ${uDays} restantes no status ${uStatus}.
    Explique que ele pode acompanhar esse contador a qualquer momento no selo dourado **[👑 Premium · X dias]** no topo superior direito da tela, ou acessando o menu **[Planos]**.
    NUNCA mencione rotas técnicas com barra como "(/plans)". Escreva apenas **[Planos]**.
  * Sempre que falar de planos, adicione os botões:
    BOTOES: 💎 Ver Planos e Assinatura | 📩 Falar com Atendente Humano`;
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
          max_tokens: 500,
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

      const rawReply =
        data.choices?.[0]?.message?.content?.trim() ||
        'Olá! Como posso ajudar você com o Aksurim Controle hoje?';

      // Extrai os botões se a IA colocou a tag BOTOES:
      const parsed = this.parseReplyAndButtons(rawReply);

      const finalButtons =
        parsed.buttons && parsed.buttons.length > 0
          ? parsed.buttons
          : this.deriveQuickReplies(userMessage, contextType, turnNumber);

      return {
        reply: parsed.cleanText,
        quickReplies: finalButtons,
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

  private parseReplyAndButtons(text: string): { cleanText: string; buttons?: string[] } {
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
