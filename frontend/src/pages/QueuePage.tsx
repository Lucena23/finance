import { useCallback, useState } from 'react';
import { addMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { PayDrawer } from '@/components/payment/PayDrawer';
import { PaymentQueue } from '@/components/payment/PaymentQueue';
import { PaymentHistory } from '@/components/payment/PaymentHistory';
import type { PaymentItem } from '@/lib/api';
import { cn } from '@/lib/cn';

/**
 * Página Principal (Fila unificada).
 */
export function QueuePage(): JSX.Element {
  const [selectedItem, setSelectedItem] = useState<PaymentItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [reloadKey, setReloadKey] = useState<number>(0);

  // Mês selecionado (0 = mês atual, 1 = próximo mês, etc)
  const [monthOffset, setMonthOffset] = useState(0);

  const referenceDate = addMonths(new Date(), monthOffset);
  const selectedMonth = referenceDate.getUTCMonth() + 1;
  const selectedYear = referenceDate.getUTCFullYear();

  // Gera array de 6 meses a partir do mês corrente para os botões
  const months = Array.from({ length: 6 }).map((_, i) => {
    const d = addMonths(new Date(), i);
    return {
      offset: i,
      label: format(d, 'MMM/yy', { locale: ptBR }).toUpperCase(),
      month: d.getUTCMonth() + 1,
      year: d.getUTCFullYear()
    };
  });

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
    setReloadKey((current) => current + 1);
  }, []);

  return (
    <section className="flex flex-col gap-5 pb-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-bold tracking-tight">Suas Despesas</h1>
        
        {/* Seletor de Meses */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
          {months.map((m) => (
            <button
              key={m.offset}
              onClick={() => setMonthOffset(m.offset)}
              className={cn(
                'whitespace-nowrap px-4 py-2 text-xs font-bold rounded-full transition-all border',
                monthOffset === m.offset
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-background text-muted-foreground border-border hover:bg-muted'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </header>

      {/* Exibimos Pendentes e Histórico do mês selecionado juntos */}
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <PaymentQueue 
            key={`queue-${reloadKey}-${monthOffset}`} 
            month={selectedMonth} 
            year={selectedYear} 
            onSelectItem={handleSelectItem} 
            hideUpcoming={true} // Uma nova prop para esconder o grupo "Futuros" se não quisermos ver tudo misturado
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
