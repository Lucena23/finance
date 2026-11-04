import { useCallback, useEffect, useState } from 'react';
import { addMonths } from 'date-fns';
import { Crown, Lock, Plus } from 'lucide-react';

import { ExpenseForm } from '@/components/expense/ExpenseForm';
import { PayDrawer } from '@/components/payment/PayDrawer';
import { PaymentQueue } from '@/components/payment/PaymentQueue';
import { PaymentHistory } from '@/components/payment/PaymentHistory';
import { MonthCarousel } from '@/components/payment/MonthCarousel';
import { LockedMonthOverlay } from '@/components/plan/LockedMonthOverlay';
import { AnimatedAdBanner } from '@/components/ads/AnimatedAdBanner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePlan } from '@/contexts/PlanContext';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { cn } from '@/lib/cn';
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
  const { categories, refetch: refetchCategories } = useCategories();
  const [selectedItem, setSelectedItem] = useState<PaymentItemWithPayer | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isCreateExpenseOpen, setIsCreateExpenseOpen] = useState<boolean>(false);
  const [reloadKey, setReloadKey] = useState<number>(0);

  const isReadOnlyMember = user?.role === Role.MEMBER && !hasPremiumAccess;

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

  useEffect(() => {
    const handlePaymentUndone = (): void => {
      setReloadKey((current) => current + 1);
    };
    window.addEventListener('payment-undone', handlePaymentUndone);
    return () => {
      window.removeEventListener('payment-undone', handlePaymentUndone);
    };
  }, []);

  const handleMonthSelect = useCallback((offset: number): void => {
    setMonthOffset(offset);
  }, []);

  const handleOpenCreateExpense = useCallback((): void => {
    if (isReadOnlyMember) {
      openPremiumModal('FAMILY_PLAN_EXPIRED');
      return;
    }
    setIsCreateExpenseOpen(true);
  }, [isReadOnlyMember, openPremiumModal]);

  const handleExpenseCreated = useCallback((): void => {
    setIsCreateExpenseOpen(false);
    setReloadKey((current) => current + 1);
  }, []);

  return (
    <section className="flex flex-col gap-5 pb-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold tracking-tight">Suas Despesas</h1>
          <Button
            type="button"
            size="sm"
            onClick={handleOpenCreateExpense}
            data-testid="queue-new-expense-button"
            className={cn(
              'gap-1.5 font-semibold shadow-sm',
              isReadOnlyMember &&
                'border border-amber-400 bg-gradient-to-r from-amber-500 to-yellow-500 font-bold text-slate-950 hover:brightness-105',
            )}
          >
            {isReadOnlyMember ? (
              <Lock aria-hidden="true" className="h-3.5 w-3.5" />
            ) : (
              <Plus aria-hidden="true" className="h-4 w-4" />
            )}
            <span>Nova Despesa</span>
            {isReadOnlyMember ? (
              <Crown aria-hidden="true" className="h-3.5 w-3.5" />
            ) : null}
          </Button>
        </div>

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
              onOpenCreateExpense={handleOpenCreateExpense}
              hideUpcoming={true}
            />
          </div>

          <div className="flex flex-col gap-3">
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

      <Dialog open={isCreateExpenseOpen} onOpenChange={setIsCreateExpenseOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nova Despesa</DialogTitle>
            <DialogDescription>
              Cadastre uma despesa avulsa, parcelada ou recorrente diretamente na sua fila.
            </DialogDescription>
          </DialogHeader>
          <ExpenseForm
            categories={categories}
            onSuccess={handleExpenseCreated}
            onCancel={() => setIsCreateExpenseOpen(false)}
            onCategoryCreated={() => void refetchCategories()}
          />
        </DialogContent>
      </Dialog>
    </section>
  );
}
