/**
 * plan.constants.ts — Constantes e tipos do modelo Freemium (v1.2) e Pagamentos (v1.3).
 *
 * Fonte única de verdade para nomes de recursos Premium, estados de plano,
 * valores oficiais em centavos (§8.2) e regras de reembolso CDC.
 */

/** Estado efetivo do plano — CALCULADO a partir das datas da FamilyAccount. */
export type PlanStatus = 'TRIAL' | 'PREMIUM' | 'GRACE' | 'FREE';

/** Recursos que exigem Premium (usados no corpo do erro 402). */
export enum PremiumFeature {
  /** Visualizar meses fora da janela Free (mês atual + próximo). */
  MONTH_HISTORY = 'MONTH_HISTORY',
  /** Relatórios PDF profissionais. */
  REPORTS = 'REPORTS',
  /** Evolução anual / qualidade do histórico (12 meses). */
  YEARLY_ANALYTICS = 'YEARLY_ANALYTICS',
  /** Criar categorias além do limite Free. */
  CATEGORY_LIMIT = 'CATEGORY_LIMIT',
  /** Adicionar membros à família. */
  MEMBERS = 'MEMBERS',
  /** Membro tentando escrever com o plano da família expirado. */
  FAMILY_PLAN_EXPIRED = 'FAMILY_PLAN_EXPIRED',
}

/** Código fixo do erro de plano (consumido pelo frontend). */
export const PLAN_REQUIRED_CODE = 'PLAN_REQUIRED';

export const DEFAULT_TRIAL_DAYS = 15;
export const DEFAULT_GRACE_DAYS = 3;
export const DEFAULT_FREE_MAX_CATEGORIES = 5;

/** Quantidade de meses visíveis no Free: mês atual (0) + próximo (1). */
export const FREE_MONTH_WINDOW = 2;

/** Fuso oficial para a virada de mês. */
export const PLAN_TIMEZONE = 'America/Sao_Paulo';

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Meses adicionados por ciclo de assinatura. */
export const BILLING_CYCLE_MONTHS = {
  MONTHLY: 1,
  SEMIANNUAL: 6,
  ANNUAL: 12,
} as const;

/**
 * Tabela oficial de preços em CENTAVOS (Regra §8.2 — inteiros).
 * Todos os valores possuem redução numerológica pitagórica = 8 (Prosperidade):
 * - Mensal:    R$ 12,95 -> 1295 centavos (1+2+9+5 = 17 -> 8)
 * - Semestral: R$ 62,90 -> 6290 centavos (6+2+9+0 = 17 -> 8)
 * - Anual:     R$ 89,90 -> 8990 centavos (8+9+9+0 = 26 -> 8)
 */
export const PLAN_PRICES_CENTS = {
  MONTHLY: 1295,
  SEMIANNUAL: 6290,
  ANNUAL: 8990,
} as const;

/** Valor mensal equivalente em centavos para exibição. */
export const PLAN_EQUIVALENT_MONTHLY_CENTS = {
  MONTHLY: 1295,
  SEMIANNUAL: 1048,
  ANNUAL: 749,
} as const;

/** Prazo legal de arrependimento (CDC Art. 49) em dias corridos. */
export const CDC_REFUND_WINDOW_DAYS = 7;

/** Versão vigente dos Termos de Uso, Política de Privacidade e Reembolso. */
export const TERMS_CURRENT_VERSION = '1.0';

/** Modalidades de pagamento aceitas no checkout. */
export type CheckoutPaymentMode =
  | 'PIX_DIRECT'
  | 'CARD_DIRECT'
  | 'CARD_RECURRING'
  | 'PIX_ONCE'
  | 'CHECKOUT_PRO';

/** Status de uma transação/assinatura no banco de dados. */
export type SubscriptionTxStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'AUTHORIZED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'REJECTED';
