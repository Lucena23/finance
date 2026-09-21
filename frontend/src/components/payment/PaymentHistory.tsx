import { RefreshCw, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { paymentItemsApi } from '@/lib/api';
import type { PaymentItemWithPayer } from '@/lib/api';
import { PaymentCard } from './PaymentCard';

interface PaymentHistoryProps {
  month?: number;
  year?: number;
}

export function PaymentHistory({ month, year }: PaymentHistoryProps): JSX.Element {
  const [items, setItems] = useState<PaymentItemWithPayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await paymentItemsApi.history({ month, year, limit: 100 });
      setItems(res.data);
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar histórico');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchHistory();
  }, [month, year]);

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
          <Button onClick={fetchHistory} variant="outline" size="sm">
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
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.id}>
          <PaymentCard
            item={item}
            urgency="OVERDUE"
            accentClass="border-l-emerald-500"
            isHistory
          />
        </li>
      ))}
    </ul>
  );
}
