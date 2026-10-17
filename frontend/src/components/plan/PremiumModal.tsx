import { useNavigate } from 'react-router-dom';
import { Check, Crown, Sparkles, Wrench } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePlan } from '@/contexts/PlanContext';
import type { PremiumFeature } from '@/lib/api';

const FEATURE_TITLES: Record<PremiumFeature, { title: string; subtitle: string }> = {
  MONTH_HISTORY: {
    title: 'Visualize todos os seus meses',
    subtitle:
      'No plano Free você acessa o mês atual e o próximo. Com o 👑 Premium você desbloqueia todo o histórico e meses futuros.',
  },
  REPORTS: {
    title: 'Relatórios Financeiros em PDF',
    subtitle:
      'Exporte relatórios executivos sintéticos e analíticos em PDF com gráficos e divisão por membro.',
  },
  YEARLY_ANALYTICS: {
    title: 'Visão Anual Completa',
    subtitle:
      'Acompanhe a evolução dos 12 meses do ano e compare o desempenho mensal.',
  },
  CATEGORY_LIMIT: {
    title: 'Categorias Ilimitadas',
    subtitle:
      'O plano Free permite até 5 categorias. Seja 👑 Premium para criar quantas categorias precisar.',
  },
  MEMBERS: {
    title: 'Adicione Membros e Participantes',
    subtitle:
      'No 👑 Premium você convida familiares, amigos, colegas de república ou parceiros para gerenciar e quitar contas em conjunto.',
  },
  FAMILY_PLAN_EXPIRED: {
    title: 'O plano Premium desta conta expirou',
    subtitle:
      'Seus dados continuam salvos, mas contas de membros ficam em modo somente leitura até que o titular renove o 👑 Premium.',
  },
};

export function PremiumModal(): JSX.Element {
  const {
    plan,
    modalState,
    closePremiumModal,
    isMaintenanceOpen,
    closeMaintenanceModal,
  } = usePlan();
  const navigate = useNavigate();

  const meta = modalState.feature
    ? FEATURE_TITLES[modalState.feature]
    : {
        title: 'Desbloqueie o 👑 Premium',
        subtitle:
          'Tenha controle financeiro completo de todos os meses, relatórios em PDF e acesso compartilhado para membros.',
      };

  const title = modalState.customTitle ?? meta.title;
  const isTrialOffer = plan?.isTrialOfferEligible ?? false;

  const handleGoToPlans = (): void => {
    closePremiumModal();
    navigate('/plans');
  };

  return (
    <>
      <Dialog
        open={modalState.open}
        onOpenChange={(open) => {
          if (!open) closePremiumModal();
        }}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-amber-400/40 bg-amber-500/15 text-amber-400">
              <Crown className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-lg font-bold">
              {title}
            </DialogTitle>
            <DialogDescription className="text-center text-sm">
              {meta.subtitle}
            </DialogDescription>
          </DialogHeader>

          <div className="my-2 flex flex-col gap-3">
            {isTrialOffer && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-400/50 bg-amber-500/15 px-3 py-2.5 text-xs font-medium text-amber-100">
                <Sparkles className="h-4 w-4 shrink-0 text-amber-400" />
                <span>
                  Oferta exclusiva do período de teste:{' '}
                  <strong className="font-bold text-amber-300">1º mês por R$ 9,99</strong> no plano mensal!
                </span>
              </div>
            )}

            <ul className="space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-foreground">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>Acesso liberado a todos os meses passados e futuros</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>Relatórios financeiros completos em PDF (Sintético e Analítico)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>Categorias ilimitadas e adição de membros participantes</span>
              </li>
            </ul>

            <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2.5 text-center text-foreground">
              <p className="text-xs font-semibold text-amber-300">
                Plano Anual — menos de R$ 0,33 por dia
              </p>
              <p className="text-sm font-bold">
                A partir de R$ 9,99/mês no plano anual
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={closePremiumModal}
              className="w-full sm:w-auto"
            >
              Agora não
            </Button>
            <Button
              type="button"
              onClick={handleGoToPlans}
              className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 font-bold text-slate-950 hover:brightness-110 sm:flex-1"
            >
              <Crown className="mr-1.5 h-4 w-4" />
              Ver planos Premium
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Checkout em Manutenção */}
      <Dialog
        open={isMaintenanceOpen}
        onOpenChange={(open) => {
          if (!open) closeMaintenanceModal();
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-amber-400/40 bg-amber-500/15 text-amber-400">
              <Wrench className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-lg font-bold">
              Pagamento online em manutenção
            </DialogTitle>
            <DialogDescription className="text-center text-sm">
              Estamos finalizando a integração automática com PIX e Cartão (Mercado Pago) para sua total segurança. Em breve você poderá concluir sua assinatura diretamente por aqui!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              onClick={closeMaintenanceModal}
              className="w-full"
            >
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
