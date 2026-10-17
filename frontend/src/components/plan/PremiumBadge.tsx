import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Crown } from 'lucide-react';

import { usePlan } from '@/contexts/PlanContext';
import { cn } from '@/lib/cn';

/**
 * PremiumBadge — Selo discreto no cabeçalho indicando o estado do plano:
 *  - TRIAL:   👑 Premium · X dias
 *  - PREMIUM: 👑 Premium
 *  - GRACE:   ⚠️ Premium vence em Xd
 *  - FREE:    Seja 👑 Premium
 */
export function PremiumBadge({ className }: { className?: string }): JSX.Element | null {
  const { plan } = usePlan();
  const navigate = useNavigate();

  if (!plan) {
    return null;
  }

  const handleClick = (): void => {
    navigate('/plans');
  };

  if (plan.status === 'PREMIUM') {
    return (
      <button
        type="button"
        onClick={handleClick}
        title="Sua família possui o plano Premium ativo"
        data-testid="premium-badge"
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-300 shadow-sm transition hover:bg-amber-500/25',
          className,
        )}
      >
        <Crown aria-hidden="true" className="h-3.5 w-3.5 text-amber-400" />
        <span>Premium</span>
      </button>
    );
  }

  if (plan.status === 'TRIAL') {
    const days = plan.daysLeft ?? 0;
    const isUrgent = days <= 3;
    return (
      <button
        type="button"
        onClick={handleClick}
        title="Clique para conhecer os planos e garantir a oferta de teste"
        data-testid="premium-badge"
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm transition',
          isUrgent
            ? 'border-amber-400/70 bg-amber-500/25 text-amber-200 hover:bg-amber-500/35'
            : 'border-amber-400/45 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25',
          className,
        )}
      >
        <Crown aria-hidden="true" className="h-3.5 w-3.5 text-amber-400" />
        <span>
          Premium · {days} {days === 1 ? 'dia' : 'dias'}
        </span>
      </button>
    );
  }

  if (plan.status === 'GRACE') {
    const days = plan.daysLeft ?? 1;
    return (
      <button
        type="button"
        onClick={handleClick}
        title="Período de tolerância — clique para renovar seu Premium"
        data-testid="premium-badge"
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border border-red-400/60 bg-red-500/20 px-3 py-1 text-xs font-bold text-red-200 shadow-sm transition hover:bg-red-500/30',
          className,
        )}
      >
        <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5 text-red-400" />
        <span>
          Vence em {days} {days === 1 ? 'dia' : 'dias'}
        </span>
      </button>
    );
  }

  // FREE
  return (
    <button
      type="button"
      onClick={handleClick}
      title="Desbloqueie todos os meses, relatórios em PDF e membros ilimitados"
      data-testid="premium-badge"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-amber-400 bg-gradient-to-r from-amber-400 to-yellow-500 px-3 py-1 text-xs font-bold text-slate-950 shadow-sm transition hover:brightness-110',
        className,
      )}
    >
      <Crown aria-hidden="true" className="h-3.5 w-3.5" />
      <span>Seja Premium</span>
    </button>
  );
}
