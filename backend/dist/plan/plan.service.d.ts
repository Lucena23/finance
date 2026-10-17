import { ConfigService } from '@nestjs/config';
import { BillingCycle } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PlanStatus, PremiumFeature } from './plan.constants';
export interface PlanDates {
    trialEndsAt: Date | null;
    premiumEndsAt: Date | null;
}
export interface MonthPeriod {
    month: number;
    year: number;
}
export interface ComputedPlan {
    status: PlanStatus;
    hasPremiumAccess: boolean;
    currentPeriodEndsAt: Date | null;
    daysLeft: number | null;
}
export interface PlanInfo {
    status: PlanStatus;
    hasPremiumAccess: boolean;
    trialEndsAt: string | null;
    premiumEndsAt: string | null;
    currentPeriodEndsAt: string | null;
    daysLeft: number | null;
    billingCycle: BillingCycle | null;
    isTrialOfferEligible: boolean;
    limits: {
        maxCategories: number | null;
        allowedPeriods: MonthPeriod[] | null;
    };
}
export interface LockedMonthSummary {
    month: number;
    year: number;
    count: number;
    totalAmount: number;
}
export declare function computePlanStatus(dates: PlanDates, now: Date, graceDays: number): ComputedPlan;
export declare function currentPeriodInTimezone(now: Date): MonthPeriod;
export declare function freeAllowedPeriods(now: Date): MonthPeriod[];
export declare function isPeriodAllowedForFree(period: MonthPeriod, now: Date): boolean;
export declare class PlanService {
    private readonly prisma;
    private readonly config;
    constructor(prisma: PrismaService, config: ConfigService);
    get trialDays(): number;
    get graceDays(): number;
    get freeMaxCategories(): number;
    computeTrialEnd(from?: Date): Date;
    getComputedPlan(familyAccountId: string): Promise<ComputedPlan>;
    hasPremiumAccess(familyAccountId: string): Promise<boolean>;
    getPlanInfo(familyAccountId: string): Promise<PlanInfo>;
    assertPremium(familyAccountId: string, feature: PremiumFeature, message?: string): Promise<void>;
    assertMonthAccess(familyAccountId: string, month?: number, year?: number): Promise<void>;
    assertCanCreateCategory(familyAccountId: string): Promise<void>;
    assertMemberCanWrite(familyAccountId: string, role: 'ADMIN' | 'MEMBER'): Promise<void>;
    freeWindowEnd(now?: Date): Date;
    getLockedMonthSummary(familyAccountId: string, month: number, year: number): Promise<LockedMonthSummary>;
    grantPremium(familyAccountId: string, cycle: BillingCycle): Promise<PlanInfo>;
    extendTrial(familyAccountId: string, days: number): Promise<PlanInfo>;
    revokePremium(familyAccountId: string): Promise<PlanInfo>;
    private findAccount;
    private readInt;
}
