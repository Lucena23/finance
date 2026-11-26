import { useContext, useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ExternalLink,
  Mail,
  MessageSquare,
  Send,
  Sparkles,
  X,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthContext } from '@/contexts/AuthContext';
import {
  ChatTurnPayload,
  supportApi,
  PublicSupportFormPayload,
} from '@/lib/api';
import { cn } from '@/lib/cn';

interface IaKsurimWidgetProps {
  isPublic?: boolean;
  className?: string;
}

interface MessageItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  quickReplies?: string[];
  isUpsell?: boolean;
  isCommercialClose?: boolean;
}

/** Menus e botões conhecidos da interface para destaque visual com badge */
const KNOWN_UI_MENUS = new Set([
  'painel',
  'despesas',
  'fila',
  'categorias',
  'config',
  'configurações',
  'planos',
  'meu plano',
  '👑 meu plano',
  'suporte',
  '+ nova despesa',
  'nova despesa',
  'exportar relatório pdf',
  'csv (lgpd)',
  'relatório pdf',
  'relatórios',
  'csv',
  'criar minha conta grátis',
  'cadastro gratuito',
  'entrar',
]);

function isMenuOrBadge(label: string): boolean {
  const normalized = label.trim().toLowerCase();
  return (
    KNOWN_UI_MENUS.has(normalized) ||
    normalized.startsWith('👑') ||
    normalized.startsWith('+ ')
  );
}

function renderInlineTokens(lineText: string) {
  // Limpa preventivamente qualquer rota técnica como (/dashboard) ou (/plans)
  const sanitized = lineText.replace(/\s*\(\/[a-z0-9_-]+\)/gi, '');
  const parts = sanitized.split(/(\*\*\[[^\]]+\]\*\*|\[[^\]]+\]|\*\*[^*]+\*\*)/g);

  return parts.map((part, idx) => {
    // 1. Tag no formato **[Nome]** ou [Nome]
    if (
      (part.startsWith('**[') && part.endsWith(']**')) ||
      (part.startsWith('[') && part.endsWith(']'))
    ) {
      const raw = part.startsWith('**[')
        ? part.slice(3, -3).trim()
        : part.slice(1, -1).trim();

      return (
        <span
          key={idx}
          className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md font-bold text-[11px] text-[#DAF043] bg-[#DAF043]/15 border border-[#DAF043]/40 shadow-sm tracking-wide align-baseline"
        >
          {raw}
        </span>
      );
    }

    // 2. Negrito padrão **Texto**
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2).trim();

      // Se for o nome de um menu em negrito simples, destaca como badge
      if (isMenuOrBadge(boldText)) {
        return (
          <span
            key={idx}
            className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md font-bold text-[11px] text-[#DAF043] bg-[#DAF043]/15 border border-[#DAF043]/40 shadow-sm tracking-wide align-baseline"
          >
            {boldText}
          </span>
        );
      }

      return (
        <strong key={idx} className="font-semibold text-white">
          {boldText}
        </strong>
      );
    }

    return part;
  });
}

function renderTable(tableLines: string[]) {
  const rows = tableLines
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|') && line.endsWith('|'))
    .map((line) =>
      line
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim()),
    );

  if (rows.length < 2) return null;
  const header = rows[0];
  const dataRows = rows.slice(1).filter((r) => !r.every((c) => /^-+$/.test(c)));

  return (
    <div className="overflow-x-auto my-2.5 rounded-lg border border-slate-700/60 bg-slate-900/80 shadow-md">
      <table className="min-w-full text-[11px] text-left border-collapse">
        <thead className="bg-slate-800/90 text-[#DAF043] font-bold border-b border-slate-700">
          <tr>
            {header.map((col, idx) => (
              <th key={idx} className="px-2.5 py-1.5 whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 text-slate-200">
          {dataRows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-slate-800/40 transition-colors">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-2.5 py-1.5 whitespace-nowrap">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderFormattedMessage(text: string) {
  const paragraphs = text.split('\n\n');
  return (
    <div className="space-y-2.5 text-[12.5px] leading-relaxed">
      {paragraphs.map((para, pIdx) => {
        const rawLines = para.split('\n').map((l) => l.trim()).filter(Boolean);

        // Verifica se o parágrafo é uma tabela Markdown
        const isTable =
          rawLines.length >= 2 &&
          rawLines.every((l) => l.startsWith('|') && l.endsWith('|'));

        if (isTable) {
          return <div key={pIdx}>{renderTable(rawLines)}</div>;
        }

        return (
          <div key={pIdx} className="space-y-1">
            {rawLines.map((line, lIdx) => {
              const isBullet =
                line.startsWith('- ') ||
                line.startsWith('* ') ||
                line.startsWith('• ');
              const lineClean = isBullet
                ? line.replace(/^[-*•]\s+/, '')
                : line;

              if (isBullet) {
                return (
                  <div key={lIdx} className="flex items-start gap-1.5 pl-1.5 my-1 text-slate-200">
                    <span className="text-[#DAF043] font-bold select-none">•</span>
                    <div className="flex-1 leading-relaxed">
                      {renderInlineTokens(lineClean)}
                    </div>
                  </div>
                );
              }

              return (
                <p key={lIdx} className="leading-relaxed text-slate-200">
                  {renderInlineTokens(line)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export function IaKsurimWidget({
  isPublic = false,
  className,
}: IaKsurimWidgetProps): JSX.Element {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'chat' | 'form'>('chat');
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);

  // Histórico de mensagens
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: isPublic
        ? 'Olá! Sou a IA-ksurim, assistente de suporte e navegação do Aksurim Controle. Como posso ajudar com seus planos ou dúvidas sobre o app hoje?'
        : 'Olá! Sou a IA-ksurim. Estou aqui para te ajudar a navegar e tirar qualquer dúvida sobre o sistema!',
      quickReplies: isPublic
        ? ['💎 Conhecer Planos e Preços', '🚀 Como Testar Grátis', '🔑 Problema de Acesso']
        : ['📊 Dúvidas no Painel', '💳 Gestão de Assinatura', '📩 Abrir Chamado'],
    },
  ]);

  // Estado do formulário formal público / escalada humana
  const authContext = useContext(AuthContext);
  const currentUser = authContext?.user;

  const [publicForm, setPublicForm] = useState<PublicSupportFormPayload>({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [formSentSuccess, setFormSentSuccess] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      setPublicForm((prev) => ({
        ...prev,
        name: prev.name || currentUser.name || '',
        email: prev.email || currentUser.email || '',
      }));
    }
  }, [currentUser]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setShowTooltip(false);
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen, messages, viewMode, isLoading]);

  async function handleSendMessage(textToSend?: string) {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsgId = String(Date.now());
    const newHistory: ChatTurnPayload[] = messages
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, sender: 'user', text },
    ]);
    setInputMessage('');
    setIsLoading(true);

    try {
      let res;
      if (isPublic) {
        res = await supportApi.chatPublic({
          message: text,
          history: newHistory,
        });
      } else {
        res = await supportApi.chatAuthenticated({
          message: text,
          history: newHistory,
        });
      }

      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'assistant',
          text: res.reply,
          quickReplies: res.quickReplies,
          isUpsell: res.isUpsell,
          isCommercialClose: res.isCommercialClose,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'assistant',
          text: 'Tivemos uma oscilação momentânea de conexão. Se preferir, você pode enviar sua dúvida diretamente pelo nosso formulário tradicional.',
          quickReplies: ['📩 Abrir Formulário de Chamado'],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleQuickReplyClick(reply: string) {
    if (
      reply.includes('Formulário') ||
      reply.includes('Abrir Chamado') ||
      reply.includes('Atendente') ||
      reply.includes('Humano') ||
      reply.includes('WhatsApp')
    ) {
      setViewMode('form');
      return;
    }
    if (
      reply.includes('Criar Conta') ||
      reply.includes('Começar 15 dias') ||
      reply.includes('Testar') ||
      reply.includes('Cadastro')
    ) {
      navigate('/register');
      setIsOpen(false);
      return;
    }
    if (reply.includes('Fazer Login') || reply.includes('Entrar')) {
      navigate('/login');
      setIsOpen(false);
      return;
    }
    if (
      reply.includes('Meu Plano') ||
      reply.includes('Plano') ||
      reply.includes('Upgrade') ||
      reply.includes('Preço') ||
      reply.includes('Assinatura')
    ) {
      if (isPublic) {
        if (reply.includes('Conhecer')) {
          void handleSendMessage('Quais são os planos e preços disponíveis?');
          return;
        }
        navigate('/register');
        setIsOpen(false);
        return;
      }
      navigate('/plans');
      setIsOpen(false);
      return;
    }
    if (reply.includes('Painel') || reply.includes('Relatório') || reply.includes('Gráfico')) {
      if (isPublic) {
        navigate('/login');
      } else {
        navigate('/dashboard');
      }
      setIsOpen(false);
      return;
    }

    void handleSendMessage(reply);
  }

  async function handleSubmitPublicForm(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    try {
      if (isPublic) {
        await supportApi.sendPublicForm(publicForm);
      } else {
        await supportApi.send({
          subject: publicForm.subject,
          message: publicForm.message,
          contact: publicForm.contact || publicForm.email,
        });
      }
      setFormSentSuccess(true);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : 'Não foi possível encaminhar o formulário no momento. Tente novamente.';
      setFormError(errorMsg);
    } finally {
      setFormLoading(false);
    }
  }

  return (
    <div className={cn('fixed bottom-5 right-5 z-50 flex flex-col items-end', className)}>
      {/* Balão de convite inicial (aparece sutilmente na primeira visita) */}
      {!isOpen && showTooltip && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsOpen(true);
            }
          }}
          className="mb-2.5 flex items-center gap-2 rounded-2xl border border-[#06777F]/40 bg-slate-900/95 px-3.5 py-2 text-xs font-medium text-slate-200 shadow-2xl backdrop-blur-md transition-all hover:scale-105 cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <Sparkles className="h-4 w-4 text-[#DAF043] animate-pulse" />
          <span>Dúvidas? Converse com a <b>IA-ksurim</b></span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowTooltip(false);
            }}
            className="ml-1 text-slate-400 hover:text-white"
            aria-label="Fechar dica"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Janela de Atendimento Flutuante */}
      {isOpen && (
        <div className="mb-3 flex h-[520px] max-h-[82vh] w-[92vw] sm:w-[390px] flex-col overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-950/95 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl animate-in zoom-in-95 duration-200">
          {/* Header do Widget */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-[#06777F]/30 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src="/images/ia-ksurim-avatar.jpg"
                  alt="IA-ksurim"
                  className="h-9 w-9 rounded-full border-2 border-[#06777F] object-cover shadow-md"
                />
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-slate-950 bg-emerald-500" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-white tracking-wide">IA-ksurim</h3>
                  <span className="rounded bg-[#06777F]/30 px-1.5 py-0.2 text-[9px] font-semibold text-[#DAF043]">
                    SUPORTE
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Atendimento e Ajuda da Plataforma</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {viewMode === 'form' ? (
                <button
                  type="button"
                  onClick={() => setViewMode('chat')}
                  className="rounded-lg p-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                  title="Voltar para o Chat"
                >
                  <MessageSquare className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setViewMode('form')}
                  className="rounded-lg p-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                  title="Formulário Formal"
                >
                  <Mail className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                aria-label="Fechar suporte"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Conteúdo: Chat com IA ou Formulário */}
          {viewMode === 'chat' ? (
            <>
              {/* Lista de Mensagens */}
              <div className="flex-1 space-y-3 overflow-y-auto p-4 text-xs scrollbar-thin scrollbar-thumb-slate-800">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      'flex flex-col',
                      m.sender === 'user' ? 'items-end' : 'items-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[88%] rounded-2xl px-3.5 py-2.5 leading-relaxed shadow-sm text-xs',
                        m.sender === 'user'
                          ? 'bg-[#06777F] text-white rounded-br-none'
                          : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
                      )}
                    >
                      {renderFormattedMessage(m.text)}
                    </div>

                    {/* Botões Rápidos / Quick Replies Clicáveis */}
                    {m.quickReplies && m.quickReplies.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5 animate-in fade-in duration-200">
                        {m.quickReplies.map((reply) => (
                          <button
                            key={reply}
                            type="button"
                            onClick={() => handleQuickReplyClick(reply)}
                            className="flex items-center gap-1.5 rounded-full border border-[#06777F]/60 bg-gradient-to-r from-slate-900 via-slate-900 to-[#06777F]/20 px-3 py-1.5 text-[11px] font-medium text-slate-200 shadow-sm transition-all hover:scale-[1.02] hover:border-[#DAF043] hover:text-white active:scale-95 cursor-pointer"
                          >
                            <span>{reply}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Cards Especiais de Upsell / Fechamento */}
                    {m.isUpsell && (
                      <div className="mt-2.5 w-full rounded-xl border border-amber-500/30 bg-amber-950/20 p-2.5">
                        <div className="flex items-center gap-1.5 font-bold text-amber-400 text-[11px]">
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Exclusivo para Assinantes Premium</span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-300">
                          Desbloqueie suporte 24/7 com a IA-ksurim, categorias ilimitadas e relatórios avançados.
                        </p>
                        <Button
                          size="sm"
                          onClick={() => {
                            navigate('/plans');
                            setIsOpen(false);
                          }}
                          className="mt-2 w-full bg-gradient-to-r from-amber-500 to-amber-600 font-bold text-slate-950 hover:from-amber-400 hover:to-amber-500 text-xs h-7"
                        >
                          Fazer Upgrade Agora
                        </Button>
                      </div>
                    )}

                    {m.isCommercialClose && (
                      <div className="mt-2.5 w-full rounded-xl border border-[#06777F]/40 bg-[#06777F]/10 p-2.5 text-center">
                        <p className="font-semibold text-white text-[11px]">Gostou do Aksurim Controle?</p>
                        <p className="mt-0.5 text-[10px] text-slate-300">
                          Crie sua conta em 30 segundos e comece com 15 dias de teste grátis sem compromisso.
                        </p>
                        <Button
                          size="sm"
                          onClick={() => {
                            navigate('/register');
                            setIsOpen(false);
                          }}
                          className="mt-2 w-full bg-[#06777F] font-bold text-white hover:bg-[#06777F]/80 text-xs h-7"
                        >
                          Começar Meu Teste Grátis <ExternalLink className="ml-1 h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex items-center gap-2 text-slate-400 text-xs italic">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#DAF043]" />
                    <span>IA-ksurim digitando...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Rodapé / Input de Chat */}
              <div className="border-t border-slate-800 bg-slate-900/60 p-2.5">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleSendMessage();
                  }}
                  className="flex items-center gap-1.5"
                >
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Digite sua dúvida..."
                    maxLength={300}
                    disabled={isLoading}
                    className="h-9 border-slate-700 bg-slate-950 text-xs text-white placeholder:text-slate-500 focus-visible:ring-[#06777F]"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!inputMessage.trim() || isLoading}
                    className="h-9 w-9 shrink-0 bg-[#06777F] p-0 text-white hover:bg-[#06777F]/80"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>

                <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-slate-400">
                  <span>IA-ksurim · Suporte da Plataforma</span>
                  <button
                    type="button"
                    onClick={() => setViewMode('form')}
                    className="text-[#DAF043] hover:underline"
                  >
                    Formulário Formal
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Visualização do Formulário Formal */
            <div className="flex-1 overflow-y-auto p-4 text-xs scrollbar-thin scrollbar-thumb-slate-800">
              <div className="mb-3 text-center">
                <h4 className="font-bold text-white text-sm">
                  {isPublic ? 'Abertura de Chamado Formal' : 'Chamado para Atendente Humano'}
                </h4>
                <p className="text-[11px] text-slate-400">
                  Nossa equipe técnica receberá seu chamado via Telegram e entrará em contato via WhatsApp ou E-mail com prioridade.
                </p>
              </div>

              {formSentSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in">
                  <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                  <p className="mt-3 font-bold text-white text-sm">Chamado encaminhado com sucesso!</p>
                  <p className="mt-1 max-w-xs text-slate-300 text-xs">
                    Nossa equipe técnica já foi notificada no Telegram do suporte e responderá via WhatsApp ou e-mail com total atenção.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      setFormSentSuccess(false);
                      setViewMode('chat');
                    }}
                    className="mt-4 bg-[#06777F] text-xs"
                  >
                    Voltar para a IA-ksurim
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmitPublicForm} className="space-y-3">
                  {formError && (
                    <div className="rounded-lg bg-red-950/40 border border-red-800 p-2 text-red-300 text-[11px]">
                      {formError}
                    </div>
                  )}

                  <div>
                    <Label className="text-[11px] text-slate-300">Seu Nome *</Label>
                    <Input
                      required
                      value={publicForm.name}
                      onChange={(e) => setPublicForm({ ...publicForm, name: e.target.value })}
                      placeholder="Ex: Carlos Eduardo"
                      className="h-8 border-slate-700 bg-slate-900 text-xs text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] text-slate-300">Seu E-mail *</Label>
                    <Input
                      required
                      type="email"
                      value={publicForm.email}
                      onChange={(e) => setPublicForm({ ...publicForm, email: e.target.value })}
                      placeholder="seuemail@exemplo.com"
                      className="h-8 border-slate-700 bg-slate-900 text-xs text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] text-slate-300">Telefone / WhatsApp (opcional)</Label>
                    <Input
                      value={publicForm.contact || ''}
                      onChange={(e) => setPublicForm({ ...publicForm, contact: e.target.value })}
                      placeholder="(XX) 9XXXX-XXXX"
                      className="h-8 border-slate-700 bg-slate-900 text-xs text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] text-slate-300">Assunto *</Label>
                    <Input
                      required
                      value={publicForm.subject}
                      onChange={(e) => setPublicForm({ ...publicForm, subject: e.target.value })}
                      placeholder="Ex: Erro no e-mail de cadastro / Dúvida comercial"
                      className="h-8 border-slate-700 bg-slate-900 text-xs text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] text-slate-300">Mensagem *</Label>
                    <textarea
                      required
                      minLength={5}
                      rows={3}
                      value={publicForm.message}
                      onChange={(e) => setPublicForm({ ...publicForm, message: e.target.value })}
                      placeholder="Descreva detalhadamente o que aconteceu..."
                      className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#06777F]"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setViewMode('chat')}
                      className="flex-1 text-xs border-slate-700 text-slate-300 h-8"
                    >
                      Voltar ao Chat
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={formLoading}
                      className="flex-1 bg-[#06777F] text-xs text-white h-8 hover:bg-[#06777F]/80"
                    >
                      {formLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Enviar Chamado'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {/* Botão Flutuante Circular */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'group relative flex h-14 w-14 max-h-14 max-w-14 shrink-0 items-center justify-center rounded-full border-2 p-0.5 shadow-[0_8px_25px_rgba(6,119,127,0.5)] transition-all duration-300 hover:scale-110 active:scale-95',
          isOpen
            ? 'border-slate-600 bg-slate-800'
            : 'border-[#DAF043] bg-gradient-to-tr from-[#06777F] to-slate-900'
        )}
        aria-label="Atendimento IA-ksurim"
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full">
            <img
              src="/images/ia-ksurim-avatar.jpg"
              alt="IA-ksurim"
              className="h-full w-full object-cover rounded-full aspect-square pointer-events-none"
            />
            {/* Brilho neon de IA */}
            <span className="absolute inset-0 rounded-full border border-[#DAF043]/30 pointer-events-none" />
          </div>
        )}
      </button>
    </div>
  );
}
