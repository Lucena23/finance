import { RefreshCw, CheckCircle2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { usePlan } from '@/contexts/PlanContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ApiError, paymentItemsApi } from '@/lib/api';
import type { PaymentItemWithPayer } from '@/lib/api';
import { PaymentCard } from './PaymentCard';
import { PaidDetailsDrawer } from './PaidDetailsDrawer';

interface PaymentHistoryProps {
  month?: number;
  year?: number;
}

export function PaymentHistory({ month, year }: PaymentHistoryProps): JSX.Element {
  const { user } = useAuth();
  const { hasPremiumAccess, openPremiumModal } = usePlan();
  const [items, setItems] = useState<PaymentItemWithPayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // TAREFA 14: item selecionado para exibir os detalhes completos da quitação.
  const [selectedItem, setSelectedItem] = useState<PaymentItemWithPayer | null>(
    null,
  );
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);

  const [isUndoing, setIsUndoing] = useState(false);

  const fetchHistory = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await paymentItemsApi.history({ month, year, limit: 100 });
      setItems(res.data);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Erro ao buscar histórico';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const handleUndoPay = useCallback(async (item: PaymentItemWithPayer) => {
    if (user?.role === 'MEMBER' && !hasPremiumAccess) {
      setIsDetailsOpen(false);
      openPremiumModal('FAMILY_PLAN_EXPIRED');
      return;
    }

    try {
      setIsUndoing(true);
      await paymentItemsApi.undoPay(item.id);
      setIsDetailsOpen(false);
      setSelectedItem(null);
      // Recarrega todo o histórico (e possivelmente a fila precisará ser recarregada,
      // mas isso demandaria um evento global ou recarregar a page inteira)
      void fetchHistory();
      // Forçar refresh da Queue - podemos disparar um custom event
      window.dispatchEvent(new CustomEvent('payment-undone'));
    } catch (err) {
      if (err instanceof ApiError && err.code === 'PLAN_REQUIRED') {
        setIsDetailsOpen(false);
        openPremiumModal(err.feature ?? 'FAMILY_PLAN_EXPIRED');
        return;
      }
      alert('Não foi possível desfazer a quitação.');
    } finally {
      setIsUndoing(false);
    }
  }, [fetchHistory, hasPremiumAccess, openPremiumModal, user?.role]);

  // TAREFA 14: abre o drawer de detalhes ao clicar em um card verde (pago).
  const handleSelectItem = useCallback((item: PaymentItemWithPayer): void => {
    setSelectedItem(item);
    setIsDetailsOpen(true);
  }, []);

  const handleDetailsOpenChange = useCallback((open: boolean): void => {
    setIsDetailsOpen(open);
    if (!open) {
      setSelectedItem(null);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-muted h-20 w-full animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
          <p className="text-sm font-medium">{error}</p>
          <Button onClick={() => void fetchHistory()} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <CheckCircle2 className="h-10 w-10 text-muted-foreground" />
          <p className="text-base font-semibold">Nenhuma conta paga ainda</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id}>
            <PaymentCard
              item={item}
              urgency="OVERDUE"
              accentClass="border-l-emerald-500"
              isHistory
              onSelect={handleSelectItem}
            />
          </li>
        ))}
      </ul>

      {/* TAREFA 14: drawer com Data/Hora, Observação e Nome do Pagador. */}
      <PaidDetailsDrawer
        item={selectedItem}
        open={isDetailsOpen}
        onOpenChange={handleDetailsOpenChange}
        onUndoPay={handleUndoPay}
        isUndoing={isUndoing}
      />
    </>
  );
}
