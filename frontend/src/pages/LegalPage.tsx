import { ArrowLeft, FileText, RefreshCcw, ShieldCheck } from 'lucide-react';
import { useLocation, useNavigate, Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/cn';

type LegalTab = 'termos' | 'privacidade' | 'reembolso';

export function LegalPage(): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab: LegalTab = location.pathname.includes('privacidade')
    ? 'privacidade'
    : location.pathname.includes('reembolso')
      ? 'reembolso'
      : 'termos';

  const handleBack = (): void => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground py-8 px-4">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <span className="text-xs text-muted-foreground">
            Aksurim Software · Versão 1.0 (Vigência: Nov/2026)
          </span>
        </div>

        {/* Abas de navegação entre os 3 documentos */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 rounded-xl border border-border bg-muted/40 p-1.5">
          <Link
            to="/termos"
            replace
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors',
              activeTab === 'termos'
                ? 'bg-card text-foreground shadow-sm border border-border/80'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <FileText className="h-3.5 w-3.5 text-primary" />
            Termos de Uso
          </Link>
          <Link
            to="/privacidade"
            replace
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors',
              activeTab === 'privacidade'
                ? 'bg-card text-foreground shadow-sm border border-border/80'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            Privacidade (LGPD)
          </Link>
          <Link
            to="/reembolso"
            replace
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors',
              activeTab === 'reembolso'
                ? 'bg-card text-foreground shadow-sm border border-border/80'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <RefreshCcw className="h-3.5 w-3.5 text-amber-400" />
            Cancelamento e Reembolso
          </Link>
        </div>

        <Card className="border-border/80 shadow-sm">
          <CardContent className="p-6 sm:p-8 space-y-5 text-sm leading-relaxed text-foreground/90">
            {activeTab === 'termos' && (
              <article className="space-y-4">
                <header className="border-b border-border pb-4">
                  <h1 className="text-xl font-bold text-foreground">
                    Termos e Condições de Uso — Aksurim Controle
                  </h1>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Operado por Aksurim Software · Atendimento oficial: suporte@aksurim.com
                  </p>
                </header>

                <section className="space-y-2">
                  <h2 className="font-bold text-foreground">1. Objeto e Natureza do Serviço</h2>
                  <p>
                    1.1. O <strong>Aksurim Controle</strong> é uma plataforma digital (SaaS / PWA) destinada ao registro, organização, fila de pagamentos, emissão de relatórios e lembretes de despesas individuais, familiares ou compartilhadas entre grupos.
                  </p>
                  <p>
                    1.2. <strong>Não somos instituição financeira:</strong> A Aksurim Software não é banco, instituição de pagamento nem consultoria de investimentos, e não realiza movimentações bancárias ou pagamento de boletos em nome do Usuário. Os registros lançados na plataforma possuem caráter estritamente organizacional.
                  </p>
                </section>

                <section className="space-y-2">
                  <h2 className="font-bold text-foreground">2. Cadastro, Conta Compartilhada e Responsabilidades</h2>
                  <p>
                    2.1. O cadastro é restrito a maiores de 18 anos. O titular do grupo (&ldquo;ADMIN&rdquo;) informa nome, e-mail, WhatsApp e CPF (utilizado para unicidade cadastral, prevenção a abusos do período de teste gratuito e identificação fiscal nos pagamentos).
                  </p>
                  <p>
                    2.2. O titular pode convidar membros participantes (&ldquo;MEMBER&rdquo;) para visualizar e quitar despesas do grupo. A contratação de planos, cancelamento e reembolso cabem exclusivamente ao titular ADMIN.
                  </p>
                </section>

                <section className="space-y-2">
                  <h2 className="font-bold text-foreground">3. Planos, Teste Gratuito e Valores</h2>
                  <p>
                    3.1. <strong>Teste Gratuito (Trial):</strong> Novas contas recebem 15 (quinze) dias corridos de acesso gratuito ao Plano Premium, sem exigência prévia de cartão.
                  </p>
                  <p>
                    3.2. <strong>Plano Gratuito (Free):</strong> Ao término do teste ou de uma assinatura, caso não haja renovação, a conta permanece ativa no Plano Gratuito (acesso ao mês vigente e ao próximo, até 5 categorias e preservação total dos dados cadastrados).
                  </p>
                  <p>
                    3.3. <strong>Plano Premium:</strong> Libera todos os meses passados e futuros, relatórios executivos em PDF/CSV, visão anual de 12 meses, categorias ilimitadas e adição de membros ativos:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
                    <li><strong>Mensal:</strong> R$ 12,95/mês (renovação automática no cartão de crédito ou pagamento avulso por 30 dias via Pix);</li>
                    <li><strong>Semestral:</strong> R$ 62,90 a cada 6 meses (pagamento único via Pix ou cartão — equivalente a R$ 10,48/mês);</li>
                    <li><strong>Anual:</strong> R$ 89,90 a cada 12 meses (pagamento único via Pix ou cartão — equivalente a R$ 7,49/mês).</li>
                  </ul>
                </section>

                <section className="space-y-2">
                  <h2 className="font-bold text-foreground">4. Processamento Seguro de Pagamentos</h2>
                  <p>
                    4.1. Os pagamentos são processados pelo <strong>Mercado Pago</strong>. A Aksurim Software não armazena números de cartão de crédito ou códigos de segurança (CVV) em seus servidores.
                  </p>
                </section>

                <section className="space-y-2">
                  <h2 className="font-bold text-foreground">5. Foro e Legislação Aplicável</h2>
                  <p>
                    5.1. Estes Termos são regidos pelas leis brasileiras, ficando assegurado ao consumidor o foro de seu domicílio (Art. 101, I do Código de Defesa do Consumidor). Contato: <strong>suporte@aksurim.com</strong>.
                  </p>
                </section>
              </article>
            )}

            {activeTab === 'privacidade' && (
              <article className="space-y-4">
                <header className="border-b border-border pb-4">
                  <h1 className="text-xl font-bold text-foreground">
                    Política de Privacidade e Proteção de Dados (LGPD)
                  </h1>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Conformidade com a Lei nº 13.709/2018 (LGPD) e Marco Civil da Internet (Lei nº 12.965/2014)
                  </p>
                </header>

                <section className="space-y-2">
                  <h2 className="font-bold text-foreground">1. Controlador e Canal do Encarregado (DPO)</h2>
                  <p>
                    <strong>Controladora:</strong> Aksurim Software<br />
                    <strong>Canal de Privacidade / Encarregado (Art. 41 LGPD):</strong> suporte@aksurim.com
                  </p>
                </section>

                <section className="space-y-2">
                  <h2 className="font-bold text-foreground">2. Dados Coletados e Finalidades</h2>
                  <ul className="list-disc pl-5 space-y-1.5">
                    <li><strong>Dados cadastrais (Nome, e-mail, WhatsApp e CPF):</strong> criação da conta, autenticação, prevenção a múltiplos testes gratuitos indevidos e emissão de cobranças (Art. 7º, V e IX da LGPD).</li>
                    <li><strong>Senha de acesso:</strong> armazenada exclusivamente como hash criptográfico irreversível (bcrypt).</li>
                    <li><strong>Dados financeiros organizacionais:</strong> despesas, categorias e baixas lançadas pelo grupo para execução do serviço contratado.</li>
                    <li><strong>Dados de pagamento:</strong> identificadores da transação e status junto ao Mercado Pago. Dados de cartão são tratados exclusivamente pelo Mercado Pago.</li>
                  </ul>
                </section>

                <section className="space-y-2">
                  <h2 className="font-bold text-foreground">3. Isolamento e Compartilhamento</h2>
                  <p>
                    3.1. <strong>Não vendemos nem comercializamos dados pessoais.</strong> Os dados são estritamente isolados por conta familiar e compartilhados apenas com operadores essenciais ao serviço (Mercado Pago para pagamentos e infraestrutura de hospedagem/e-mail transacional).
                  </p>
                </section>

                <section className="space-y-2">
                  <h2 className="font-bold text-foreground">4. Direitos do Titular (Art. 18 da LGPD)</h2>
                  <p>
                    Você pode solicitar a qualquer momento pelo e-mail <strong>suporte@aksurim.com</strong> o acesso, correção, exportação (também disponível em PDF/CSV no sistema) ou exclusão definitiva da sua conta e dados pessoais.
                  </p>
                </section>
              </article>
            )}

            {activeTab === 'reembolso' && (
              <article className="space-y-4">
                <header className="border-b border-border pb-4">
                  <h1 className="text-xl font-bold text-foreground">
                    Política de Cancelamento, Renovação e Reembolso
                  </h1>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Em estrita observância ao Código de Defesa do Consumidor (Lei nº 8.078/1990 — Art. 49)
                  </p>
                </header>

                <section className="space-y-2">
                  <h2 className="font-bold text-foreground">1. Como Funciona a Renovação</h2>
                  <p>
                    1.1. <strong>Mensal no Cartão de Crédito (Renovação Automática):</strong> cobra R$ 12,95 mensalmente de forma automática. Enviamos aviso por e-mail 3 (três) dias antes de cada renovação. Não há fidelidade nem multa: você pode cancelar a renovação com 1 clique em <em>Planos</em> ou <em>Configurações</em>.
                  </p>
                  <p>
                    1.2. <strong>Mensal via Pix (30 dias), Semestral (R$ 62,90) e Anual (R$ 89,90):</strong> são pagamentos únicos pelo período escolhido, sem débito automático subsequente.
                  </p>
                </section>

                <section className="space-y-2">
                  <h2 className="font-bold text-foreground">
                    2. Direito de Arrependimento em até 7 Dias (Reembolso Integral Automático)
                  </h2>
                  <p>
                    2.1. Conforme o <strong>Art. 49 do Código de Defesa do Consumidor</strong>, você pode desistir da primeira contratação do Plano Premium em até <strong>7 (sete) dias corridos</strong> contados da confirmação do pagamento, recebendo <strong>100% do valor pago de volta</strong>.
                  </p>
                  <p>
                    2.2. <strong>Solicitação em 1 clique no sistema:</strong> Dentro dos 7 dias corridos, basta acessar a página <em>Planos</em> ou <em>Configurações</em> e clicar em <strong>&ldquo;Cancelar e solicitar reembolso integral (7 dias)&rdquo;</strong>. O estorno é enviado imediatamente ao Mercado Pago (devolução via Pix na conta de origem ou estorno na fatura do cartão). Você também pode solicitar pelo menu <em>Suporte</em> ou pelo e-mail <strong>suporte@aksurim.com</strong>.
                  </p>
                </section>

                <section className="space-y-2">
                  <h2 className="font-bold text-foreground">3. Cancelamento Após 7 Dias</h2>
                  <p>
                    3.1. Após o prazo legal de 7 dias, o cancelamento da assinatura mensal recorrente interrompe imediatamente qualquer cobrança futura, e o seu acesso Premium permanece liberado até o último dia do ciclo já pago. Ao final do período, a conta retorna ao Plano Gratuito preservando todos os seus dados.
                  </p>
                </section>
              </article>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
