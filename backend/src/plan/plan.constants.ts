/**
 * plan.constants.ts — Constantes e tipos do modelo Freemium (v1.2).
 *
 * Fonte única de verdade para nomes de recursos Premium, estados de plano e
 * valores padrão. Os valores numéricos podem ser sobrescritos via .env:
 *  - TRIAL_DAYS            (padrão 15)
 *  - PLAN_GRACE_DAYS       (padrão 3)
 *  - FREE_MAX_CATEGORIES   (padrão 5)
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
