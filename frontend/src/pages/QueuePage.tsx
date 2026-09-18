/**
 * QueuePage.tsx — Página principal: Fila de Pagamentos (TAREFA 38 + 40).
 *
 * Tela operacional principal do produto. Renderiza a fila de compromissos
 * pendentes agrupada por urgência (atraso → mês atual → futuros) através do
 * componente <PaymentQueue />, que consome GET /payment-items/queue.
 *
 * Integra a gaveta modal de quitação (<PayDrawer />): ao selecionar um card,
 * o drawer é aberto com o item pré-preenchido; após a quitação bem-sucedida,
 * a fila é recarregada para refletir a baixa (RN-07).
 */

import { useCallback, useState } from 'react';

import { PayDrawer } from '@/components/payment/PayDrawer';
import { PaymentQueue } from '@/components/payment/PaymentQueue';
import type { PaymentItem } from '@/lib/api';

/**
 * Página da Fila de Pagamentos (rota raiz "/").
 */
export function QueuePage(): JSX.Element {
  const [selectedItem, setSelectedItem] = useState<PaymentItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [reloadKey, setReloadKey] = useState<number>(0);

  const handleSelectItem = useCallback((item: PaymentItem): void => {
    setSelectedItem(item);
    setIsDrawerOpen(true);
  }, []);

  const handleOpenChange = useCallback((open: boolean): void => {
    setIsDrawerOpen(open);

    if (!open) {
      setSelectedItem(null);
    }
  }, []);

  const handlePaid = useCallback((): void => {
    // Força a remontagem da fila para recarregar os dados da API.
    setReloadKey((current) => current + 1);
  }, []);

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight">Fila de Pagamentos</h1>
        <p className="text-muted-foreground text-sm">
          Compromissos pendentes ordenados por urgência: em atraso, mês atual e
          futuros.
        </p>
      </header>

      <PaymentQueue key={reloadKey} onSelectItem={handleSelectItem} />

      <PayDrawer
        item={selectedItem}
        open={isDrawerOpen}
        onOpenChange={handleOpenChange}
        onPaid={handlePaid}
      />
    </section>
  );
}
