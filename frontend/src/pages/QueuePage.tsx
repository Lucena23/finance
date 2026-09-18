/**
 * QueuePage.tsx — Página principal: Fila de Pagamentos (TAREFA 38).
 *
 * Tela operacional principal do produto. Renderiza a fila de compromissos
 * pendentes agrupada por urgência (atraso → mês atual → futuros) através do
 * componente <PaymentQueue />, que consome GET /payment-items/queue.
 *
 * A gaveta modal de quitação (PayDrawer) é integrada na TAREFA 40; aqui o
 * callback de seleção de item é apenas encaminhado.
 */

import { PaymentQueue } from '@/components/payment/PaymentQueue';

/**
 * Página da Fila de Pagamentos (rota raiz "/").
 */
export function QueuePage(): JSX.Element {
  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight">Fila de Pagamentos</h1>
        <p className="text-muted-foreground text-sm">
          Compromissos pendentes ordenados por urgência: em atraso, mês atual e
          futuros.
        </p>
      </header>

      <PaymentQueue />
    </section>
  );
}
