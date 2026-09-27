import { useCallback, useState } from 'react';
import { addMonths } from 'date-fns';

import { PayDrawer } from '@/components/payment/PayDrawer';
import { PaymentQueue } from '@/components/payment/PaymentQueue';
import { PaymentHistory } from '@/components/payment/PaymentHistory';
import { MonthCarousel } from '@/components/payment/MonthCarousel';
import { AdBanner } from '@/components/ads/AdBanner';
import type { PaymentItemWithPayer } from '@/lib/api';

/**
 * Página Principal (Fila unificada).
 *
 * TAREFA 16: o seletor de meses foi refatorado para o componente
 * `MonthCarousel` (carrossel acessível por teclado). O offset do mês
 * selecionado é mantido em estado local, preservando o filtro enquanto o
 * usuário navega entre as seções da página.
 */
export function QueuePage(): JSX.Element {
  const [selectedItem, setSelectedItem] = useState<PaymentItemWithPayer | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [reloadKey, setReloadKey] = useState<number>(0);

  // Mês selecionado (0 = mês atual, 1 = próximo mês, etc).
  // O estado é preservado ao navegar entre páginas (filtro mantido).
  const [monthOffset, setMonthOffset] = useState(0);

  const referenceDate = addMonths(new Date(), monthOffset);
  const selectedMonth = referenceDate.getMonth() + 1;
  const selectedYear = referenceDate.getFullYear();

  const handleSelectItem = useCallback((item: PaymentItemWithPayer): void => {
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
    setReloadKey((current) => current + 1);
  }, []);

  const handleMonthSelect = useCallback((offset: number): void => {
    setMonthOffset(offset);
  }, []);

  return (
    <section className="flex flex-col gap-5 pb-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-bold tracking-tight">Suas Despesas</h1>

        {/* AdBanner Injetado - Placeholders de Ads Mobile Leaderboard */}
        <div className="py-2">
          <AdBanner type="leaderboard" />
        </div>

        {/* Seletor de Meses (TAREFA 16) */}
        <MonthCarousel value={monthOffset} onSelect={handleMonthSelect} />
      </header>

      {/* Exibimos Pendentes e Histórico do mês selecionado juntos */}
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <PaymentQueue
            key={`queue-${reloadKey}-${monthOffset}`}
            month={selectedMonth}
            year={selectedYear}
            onSelectItem={handleSelectItem}
            hideUpcoming={true}
          />
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-emerald-600 px-3 py-2 bg-emerald-50 rounded-md">
            <span>🟢</span> Pagas neste Mês
          </h2>
          <PaymentHistory
            key={`hist-${reloadKey}-${monthOffset}`}
            month={selectedMonth}
            year={selectedYear}
          />
        </div>
      </div>

      <PayDrawer
        item={selectedItem}
        open={isDrawerOpen}
        onOpenChange={handleOpenChange}
        onPaid={handlePaid}
      />
    </section>
  );
}
