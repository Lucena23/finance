/**
 * QueuePage.tsx — Página principal: Fila de Pagamentos (TAREFA 37 placeholder).
 *
 * Tela operacional principal do produto. O conteúdo completo (agrupamento por
 * urgência, cards e gaveta de quitação) é implementado nas TAREFAS 38–40.
 */

import { PagePlaceholder } from '@/components/layout/PagePlaceholder';

/**
 * Página da Fila de Pagamentos (rota raiz "/").
 */
export function QueuePage(): JSX.Element {
  return (
    <PagePlaceholder
      title="Fila de Pagamentos"
      description="Compromissos pendentes ordenados por urgência: em atraso, mês atual e futuros."
    />
  );
}
