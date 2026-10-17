import { Check, Crown, ShieldCheck, Sparkles, Star } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePlan } from '@/contexts/PlanContext';
import { cn } from '@/lib/cn';

interface PlanTier {
  id: 'MONTHLY' | 'SEMIANNUAL' | 'ANNUAL';
  name: string;
  monthlyPrice: string;
  trialOfferPrice?: string;
  totalPrice: string;
  discountBadge?: string;
  popular?: boolean;
  subtitle: string;
}

const TIERS: readonly PlanTier[] = [
  {
    id: 'MONTHLY',
    name: 'Mensal',
    monthlyPrice: 'R$ 15,99',
    trialOfferPrice: 'R$ 9,99',
    totalPrice: 'Cobrado mensalmente',
    subtitle: 'Flexibilidade total para seu controle',
  },
  {
    id: 'SEMIANNUAL',
    name: 'Semestral',
    monthlyPrice: 'R$ 12,99',
    totalPrice: 'Total R$ 77,94 a cada 6 meses',
    discountBadge: 'Economize 19%',
    subtitle: 'Equilíbrio ideal entre economia e prazo',
  },
  {
    id: 'ANNUAL',
    name: 'Anual',
    monthlyPrice: 'R$ 9,99',
    totalPrice: 'Total R$ 119,88 por ano',
    discountBadge: 'Economize 37%',
    popular: true,
    subtitle: 'Menos de R$ 0,33 por dia',
  },
];

const BENEFITS = [
  'Visualização liberada de todos os meses passados e futuros na Fila e no Painel',
  'Exportação de Relatórios Executivos em PDF (Sintético e Analítico)',
  'Gráfico completo da Evolução Anual (12 meses)',
  'Criação ilimitada de Categorias personalizadas',
  'Adição de membros e participantes com acesso compartilhado para quitar e gerenciar contas',
];

export function PlansPage(): JSX.Element {
  const { plan, openMaintenanceModal } = usePlan();
  const isTrialOffer = plan?.isTrialOfferEligible ?? false;
  const isPaidPremium = plan?.status === 'PREMIUM';

  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-6 pb-12 pt-2">
      <header className="flex flex-col items-center gap-2.5 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/15 px-3.5 py-1 text-xs font-bold text-amber-300 shadow-sm">
          <Crown className="h-3.5 w-3.5 text-amber-400" />
          Aksurim Controle · Premium
        </span>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Controle financeiro inteligente, individual ou compartilhado
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Planeje todos os meses do ano, gere relatórios profissionais em PDF e compartilhe a gestão de contas com sua família, amigos, república ou parceiros por menos de R$ 0,33 ao dia.
        </p>

        {isTrialOffer && (
          <div className="mt-1 inline-flex items-center gap-2 rounded-xl border border-amber-400/50 bg-amber-500/15 px-4 py-2.5 text-xs font-medium text-amber-100 shadow-sm">
            <Sparkles className="h-4 w-4 shrink-0 text-amber-400" />
            <span>
              Oferta ativa durante seu período de teste ({plan?.daysLeft} dia(s) restantes):{' '}
              <strong className="font-extrabold text-amber-300">
                1º mês por R$ 9,99
              </strong>{' '}
              no plano Mensal!
            </span>
          </div>
        )}

        {isPaidPremium && (
          <div className="mt-1 inline-flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-2.5 text-xs font-semibold text-emerald-200">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>
              Sua família já possui o plano 👑 Premium ativo ({plan?.daysLeft ?? 0} dias restantes).
            </span>
          </div>
        )}
      </header>

      {/* Cards de Planos */}
      <div className="grid grid-cols-1 gap-5 pt-2 md:grid-cols-3">
        {TIERS.map((tier) => {
          const showTrialPromo = tier.id === 'MONTHLY' && isTrialOffer;

          return (
            <Card
              key={tier.id}
              className={cn(
                'relative flex flex-col justify-between transition-all',
                tier.popular
                  ? 'border-2 border-amber-400/90 bg-gradient-to-b from-amber-500/[0.08] to-card shadow-lg shadow-amber-500/10'
                  : showTrialPromo
                    ? 'border border-amber-400/40 bg-card'
                    : 'border-border bg-card',
              )}
            >
              {tier.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-950 shadow-md">
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3 w-3 fill-slate-950" /> Mais escolhido
                  </span>
                </div>
              )}

              <CardContent className="flex flex-1 flex-col justify-between gap-6 p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg font-bold text-foreground">{tier.name}</h2>
                    {tier.discountBadge ? (
                      <span className="whitespace-nowrap rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                        {tier.discountBadge}
                      </span>
                    ) : showTrialPromo ? (
                      <span className="whitespace-nowrap rounded-full border border-amber-400/40 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
                        Oferta 1º Mês
                      </span>
                    ) : null}
                  </div>

                  <p className="text-xs text-muted-foreground">{tier.subtitle}</p>

                  <div className="pt-2">
                    {showTrialPromo ? (
                      <div className="space-y-1">
                        <span className="block text-xs text-muted-foreground line-through">
                          De {tier.monthlyPrice}/mês
                        </span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-3xl font-extrabold text-amber-400">
                            {tier.trialOfferPrice}
                          </span>
                          <span className="text-xs font-semibold text-amber-200/90">
                            no 1º mês
                          </span>
                        </div>
                        <p className="text-xs font-medium text-amber-200/80">
                          Depois R$ 15,99/mês · exclusivo no teste
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-extrabold text-foreground">
                            {tier.monthlyPrice}
                          </span>
                          <span className="text-xs text-muted-foreground">/mês</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {tier.totalPrice}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={openMaintenanceModal}
                  className={cn(
                    'w-full font-bold transition-all',
                    tier.popular
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-md hover:brightness-110'
                      : showTrialPromo
                        ? 'border-amber-400/60 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25 hover:text-amber-100'
                        : 'hover:border-amber-400/50 hover:text-amber-200',
                  )}
                  variant={tier.popular ? 'default' : 'outline'}
                >
                  <Crown className="mr-1.5 h-4 w-4" />
                  Assinar {tier.name}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Lista de Benefícios */}
      <Card className="border-border/80 bg-card/90">
        <CardContent className="p-6">
          <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
            <Crown className="h-4 w-4 text-amber-400" />
            Tudo o que está incluído no Premium
          </h3>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2.5 text-sm text-foreground/90">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
