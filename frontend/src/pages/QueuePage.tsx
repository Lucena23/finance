import { useCallback, useState } from 'react';
import { addMonths } from 'date-fns';

import { PayDrawer } from '@/components/payment/PayDrawer';
import { PaymentQueue } from '@/components/payment/PaymentQueue';
import { PaymentHistory } from '@/components/payment/PaymentHistory';
import { MonthCarousel } from '@/components/payment/MonthCarousel';
import { LockedMonthOverlay } from '@/components/plan/LockedMonthOverlay';
import { AnimatedAdBanner } from '@/components/ads/AnimatedAdBanner';
import { usePlan } from '@/contexts/PlanContext';
import { useAuth } from '@/hooks/useAuth';
import { Role } from '@/lib/constants';
import type { PaymentItemWithPayer } from '@/lib/api';

/**
 * Página Principal (Fila unificada).
 *
 * TAREFA 16: o seletor de meses foi refatorado para o componente
 * `MonthCarousel` (carrossel acessível por teclado). O offset do mês
 * selecionado é mantido em estado local, preservando o filtro enquanto o
 * usuário navega entre as seções da página.
 *
 * TAREFA 19: banner animado (Mobile Leaderboard IAB 320x50) posicionado
 * logo abaixo do filtro de meses, conforme especificação do BLUEPRINT §4.
 */
export function QueuePage(): JSX.Element {
  const { user } = useAuth();
  const { canViewPeriod, hasPremiumAccess, openPremiumModal } = usePlan();
  const [selectedItem, setSelectedItem] = useState<PaymentItemWithPayer | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [reloadKey, setReloadKey] = useState<number>(0);

  // Mês selecionado (0 = mês atual, 1 = próximo mês, etc).
  // O estado é preservado ao navegar entre páginas (filtro mantido).
  const [monthOffset, setMonthOffset] = useState(0);

  const referenceDate = addMonths(new Date(), monthOffset);
  const selectedMonth = referenceDate.getMonth() + 1;
  const selectedYear = referenceDate.getFullYear();
  const isMonthUnlocked = canViewPeriod(selectedMonth, selectedYear);

  const handleSelectItem = useCallback(
    (item: PaymentItemWithPayer): void => {
      if (user?.role === Role.MEMBER && !hasPremiumAccess) {
        openPremiumModal('FAMILY_PLAN_EXPIRED');
        return;
      }
      setSelectedItem(item);
      setIsDrawerOpen(true);
    },
    [user?.role, hasPremiumAccess, openPremiumModal],
  );

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

        {/* Seletor de Meses (TAREFA 16) */}
        <MonthCarousel value={monthOffset} onSelect={handleMonthSelect} />

        {/* Banner de Ads animado — Mobile Leaderboard IAB 320x50 (TAREFA 19) */}
        <div className="py-2">
          <AnimatedAdBanner type="leaderboard" />
        </div>
      </header>

      {!isMonthUnlocked ? (
        <LockedMonthOverlay
          month={selectedMonth}
          year={selectedYear}
          variant="queue"
          onBackToCurrentMonth={() => setMonthOffset(0)}
        />
      ) : (
        /* Exibimos Pendentes e Histórico do mês selecionado juntos */
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
            <h2 className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-300">
              <span>🟢</span> Pagas neste Mês
            </h2>
            <PaymentHistory
              key={`hist-${reloadKey}-${monthOffset}`}
              month={selectedMonth}
              year={selectedYear}
            />
          </div>
        </div>
      )}

      <PayDrawer
        item={selectedItem}
        open={isDrawerOpen}
        onOpenChange={handleOpenChange}
        onPaid={handlePaid}
      />
    </section>
  );
}
