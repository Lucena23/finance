import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BillingCycle } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import {
  BILLING_CYCLE_MONTHS,
  DAY_MS,
  DEFAULT_FREE_MAX_CATEGORIES,
  DEFAULT_GRACE_DAYS,
  DEFAULT_TRIAL_DAYS,
  FREE_MONTH_WINDOW,
  PLAN_TIMEZONE,
  PlanStatus,
  PremiumFeature,
} from './plan.constants';
import { PlanRequiredException } from './plan-required.exception';

/** Datas de plano persistidas na FamilyAccount. */
export interface PlanDates {
  trialEndsAt: Date | null;
  premiumEndsAt: Date | null;
}

/** Período mês/ano (mês 1–12). */
export interface MonthPeriod {
  month: number;
  year: number;
}

/** Resultado puro do cálculo de status (sem I/O — testável). */
export interface ComputedPlan {
  status: PlanStatus;
  hasPremiumAccess: boolean;
  /** Data limite do estado atual (fim do teste, do Premium ou da tolerância). */
  currentPeriodEndsAt: Date | null;
  /** Dias restantes até `currentPeriodEndsAt` (arredondado para cima). */
  daysLeft: number | null;
}

/** Informações de plano expostas ao frontend (GET /plan). */
export interface PlanInfo {
  status: PlanStatus;
  hasPremiumAccess: boolean;
  trialEndsAt: string | null;
  premiumEndsAt: string | null;
  currentPeriodEndsAt: string | null;
  daysLeft: number | null;
  billingCycle: BillingCycle | null;
  /** Oferta R$ 9,99 no 1º mês do plano mensal — somente durante o teste. */
  isTrialOfferEligible: boolean;
  limits: {
    /** null = ilimitado. */
    maxCategories: number | null;
    /** Meses liberados (null = todos). */
    allowedPeriods: MonthPeriod[] | null;
  };
}

/** Resumo de um mês bloqueado (para o desfoque) — sem detalhes das despesas. */
export interface LockedMonthSummary {
  month: number;
  year: number;
  count: number;
  totalAmount: number;
}

/**
 * Calcula o estado efetivo do plano a partir das datas (função pura).
 *
 * Precedência:
 *  1. PREMIUM — premiumEndsAt no futuro.
 *  2. TRIAL   — trialEndsAt no futuro.
 *  3. GRACE   — até `graceDays` após o último vencimento (teste ou Premium).
 *  4. FREE    — demais casos.
 */
export function computePlanStatus(
  dates: PlanDates,
  now: Date,
  graceDays: number,
): ComputedPlan {
  const nowMs = now.getTime();
  const { trialEndsAt, premiumEndsAt } = dates;

  if (premiumEndsAt && premiumEndsAt.getTime() > nowMs) {
    return buildComputed('PREMIUM', premiumEndsAt, nowMs);
  }

  if (trialEndsAt && trialEndsAt.getTime() > nowMs) {
    return buildComputed('TRIAL', trialEndsAt, nowMs);
  }

  const lastEndMs = Math.max(
    premiumEndsAt?.getTime() ?? 0,
    trialEndsAt?.getTime() ?? 0,
  );

  if (lastEndMs > 0) {
    const graceEnd = new Date(lastEndMs + graceDays * DAY_MS);
    if (graceEnd.getTime() > nowMs) {
      return buildComputed('GRACE', graceEnd, nowMs);
    }
  }

  return {
    status: 'FREE',
    hasPremiumAccess: false,
    currentPeriodEndsAt: null,
    daysLeft: null,
  };
}

function buildComputed(
  status: Exclude<PlanStatus, 'FREE'>,
  endsAt: Date,
  nowMs: number,
): ComputedPlan {
  return {
    status,
    hasPremiumAccess: true,
    currentPeriodEndsAt: endsAt,
    daysLeft: Math.max(0, Math.ceil((endsAt.getTime() - nowMs) / DAY_MS)),
  };
}

/** Mês/ano correntes no fuso America/Sao_Paulo. */
export function currentPeriodInTimezone(now: Date): MonthPeriod {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: PLAN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
  });
  const [yearPart, monthPart] = formatter.format(now).split('-');
  return { month: Number(monthPart), year: Number(yearPart) };
}

/** Lista dos meses liberados no Free (mês atual + próximo). */
export function freeAllowedPeriods(now: Date): MonthPeriod[] {
  const current = currentPeriodInTimezone(now);
  const periods: MonthPeriod[] = [];
  for (let offset = 0; offset < FREE_MONTH_WINDOW; offset++) {
    const index = current.year * 12 + (current.month - 1) + offset;
    periods.push({ year: Math.floor(index / 12), month: (index % 12) + 1 });
  }
  return periods;
}

/** Verifica se um mês está dentro da janela Free. */
export function isPeriodAllowedForFree(period: MonthPeriod, now: Date): boolean {
  return freeAllowedPeriods(now).some(
    (p) => p.month === period.month && p.year === period.year,
  );
}

/**
 * PlanService — regra central do Freemium (v1.2).
 *
 * TODA decisão de acesso Premium passa por aqui. O frontend apenas reflete
 * o que o backend decide (bloqueios reais acontecem no servidor).
 */
@Injectable()
export class PlanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ─── Configuração ────────────────────────────────────────────────────

  get trialDays(): number {
    return this.readInt('TRIAL_DAYS', DEFAULT_TRIAL_DAYS, false);
  }

  get graceDays(): number {
    return this.readInt('PLAN_GRACE_DAYS', DEFAULT_GRACE_DAYS, true);
  }

  get freeMaxCategories(): number {
    return this.readInt('FREE_MAX_CATEGORIES', DEFAULT_FREE_MAX_CATEGORIES, false);
  }

  /** Data de fim do teste para um novo cadastro. */
  computeTrialEnd(from: Date = new Date()): Date {
    return new Date(from.getTime() + this.trialDays * DAY_MS);
  }

  // ─── Consulta de plano ───────────────────────────────────────────────

  async getComputedPlan(familyAccountId: string): Promise<ComputedPlan> {
    const account = await this.findAccount(familyAccountId);
    return computePlanStatus(account, new Date(), this.graceDays);
  }

  async hasPremiumAccess(familyAccountId: string): Promise<boolean> {
    return (await this.getComputedPlan(familyAccountId)).hasPremiumAccess;
  }

  async getPlanInfo(familyAccountId: string): Promise<PlanInfo> {
    const account = await this.findAccount(familyAccountId);
    const now = new Date();
    const computed = computePlanStatus(account, now, this.graceDays);

    return {
      status: computed.status,
      hasPremiumAccess: computed.hasPremiumAccess,
      trialEndsAt: account.trialEndsAt?.toISOString() ?? null,
      premiumEndsAt: account.premiumEndsAt?.toISOString() ?? null,
      currentPeriodEndsAt: computed.currentPeriodEndsAt?.toISOString() ?? null,
      daysLeft: computed.daysLeft,
      billingCycle: account.billingCycle,
      isTrialOfferEligible: computed.status === 'TRIAL',
      limits: {
        maxCategories: computed.hasPremiumAccess ? null : this.freeMaxCategories,
        allowedPeriods: computed.hasPremiumAccess ? null : freeAllowedPeriods(now),
      },
    };
  }

  // ─── Asserções (lançam 402) ──────────────────────────────────────────

  /** Exige Premium ativo (TRIAL, PREMIUM ou GRACE). */
  async assertPremium(
    familyAccountId: string,
    feature: PremiumFeature,
    message = 'Este recurso é exclusivo do plano Premium.',
  ): Promise<void> {
    if (!(await this.hasPremiumAccess(familyAccountId))) {
      throw new PlanRequiredException(feature, message);
    }
  }

  /**
   * Exige acesso ao mês informado. Free: apenas mês atual + próximo.
   * Mês/ano ausentes são tratados como o mês corrente (sempre liberado).
   */
  async assertMonthAccess(
    familyAccountId: string,
    month?: number,
    year?: number,
  ): Promise<void> {
    const now = new Date();
    const current = currentPeriodInTimezone(now);
    const period: MonthPeriod = {
      month: month ?? current.month,
      year: year ?? current.year,
    };

    if (isPeriodAllowedForFree(period, now)) {
      return;
    }

    if (!(await this.hasPremiumAccess(familyAccountId))) {
      throw new PlanRequiredException(
        PremiumFeature.MONTH_HISTORY,
        'Visualizar este mês é exclusivo do plano Premium.',
      );
    }
  }

  /** Free: no máximo `FREE_MAX_CATEGORIES` categorias para CRIAR novas. */
  async assertCanCreateCategory(familyAccountId: string): Promise<void> {
    if (await this.hasPremiumAccess(familyAccountId)) {
      return;
    }

    const count = await this.prisma.category.count({ where: { familyAccountId } });

    if (count >= this.freeMaxCategories) {
      throw new PlanRequiredException(
        PremiumFeature.CATEGORY_LIMIT,
        `O plano Free permite até ${this.freeMaxCategories} categorias. Seja Premium para criar categorias ilimitadas.`,
      );
    }
  }

  /**
   * Garante que membros secundários (Role.MEMBER) fiquem em modo somente leitura
   * quando o plano da conta está no Free. No Trial/Premium/Grace, membros têm
   * acesso completo de escrita.
   */
  async assertMemberCanWrite(
    familyAccountId: string,
    role: 'ADMIN' | 'MEMBER',
  ): Promise<void> {
    if (role !== 'MEMBER') {
      return;
    }

    if (!(await this.hasPremiumAccess(familyAccountId))) {
      throw new PlanRequiredException(
        PremiumFeature.FAMILY_PLAN_EXPIRED,
        'O plano Premium desta conta expirou. Peça ao titular para assinar e liberar suas ações.',
      );
    }
  }

  /** Último dia (inclusive, UTC @db.Date) visível no Free — fim do próximo mês. */
  freeWindowEnd(now: Date = new Date()): Date {
    const periods = freeAllowedPeriods(now);
    const last = periods[periods.length - 1];
    return new Date(Date.UTC(last.year, last.month, 0));
  }

  // ─── Resumo para o desfoque ──────────────────────────────────────────

  /**
   * Quantidade e soma das parcelas de um mês — usado no desfoque do Free.
   * NUNCA retorna títulos, categorias ou valores individuais.
   */
  async getLockedMonthSummary(
    familyAccountId: string,
    month: number,
    year: number,
  ): Promise<LockedMonthSummary> {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    const aggregate = await this.prisma.paymentItem.aggregate({
      where: {
        dueDate: { gte: start, lt: end },
        expense: { familyAccountId, deletedAt: null },
      },
      _count: { _all: true },
      _sum: { expectedAmount: true },
    });

    return {
      month,
      year,
      count: aggregate._count._all,
      totalAmount: aggregate._sum.expectedAmount ?? 0,
    };
  }

  // ─── Administração (Admin Global) ────────────────────────────────────

  /** Concede/estende Premium por um ciclo, a partir do maior entre agora e o vencimento atual. */
  async grantPremium(familyAccountId: string, cycle: BillingCycle): Promise<PlanInfo> {
    const account = await this.findAccount(familyAccountId);
    const now = new Date();
    const base =
      account.premiumEndsAt && account.premiumEndsAt.getTime() > now.getTime()
        ? account.premiumEndsAt
        : now;

    const premiumEndsAt = new Date(base);
    premiumEndsAt.setMonth(premiumEndsAt.getMonth() + BILLING_CYCLE_MONTHS[cycle]);

    await this.prisma.familyAccount.update({
      where: { id: familyAccountId },
      data: { premiumEndsAt, billingCycle: cycle },
    });

    return this.getPlanInfo(familyAccountId);
  }

  /** Estende (ou reinicia) o teste por N dias a partir de agora. */
  async extendTrial(familyAccountId: string, days: number): Promise<PlanInfo> {
    await this.findAccount(familyAccountId);
    await this.prisma.familyAccount.update({
      where: { id: familyAccountId },
      data: { trialEndsAt: new Date(Date.now() + days * DAY_MS) },
    });
    return this.getPlanInfo(familyAccountId);
  }

  /** Remove o Premium e encerra o teste imediatamente (vira FREE, sem tolerância). */
  async revokePremium(familyAccountId: string): Promise<PlanInfo> {
    await this.findAccount(familyAccountId);
    const expired = new Date(Date.now() - (this.graceDays + 1) * DAY_MS);
    await this.prisma.familyAccount.update({
      where: { id: familyAccountId },
      data: { premiumEndsAt: null, billingCycle: null, trialEndsAt: expired },
    });
    return this.getPlanInfo(familyAccountId);
  }

  // ─── Internos ────────────────────────────────────────────────────────

  private async findAccount(
    familyAccountId: string,
  ): Promise<PlanDates & { billingCycle: BillingCycle | null }> {
    const account = await this.prisma.familyAccount.findUnique({
      where: { id: familyAccountId },
      select: { trialEndsAt: true, premiumEndsAt: true, billingCycle: true },
    });

    if (!account) {
      throw new NotFoundException('Conta familiar não encontrada.');
    }

    return account;
  }

  private readInt(key: string, fallback: number, allowZero: boolean): number {
    const raw = Number(this.config.get<string>(key));
    if (!Number.isFinite(raw) || !Number.isInteger(raw)) return fallback;
    if (raw < 0 || (!allowZero && raw === 0)) return fallback;
    return raw;
  }
}
