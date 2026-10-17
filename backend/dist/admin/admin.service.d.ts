import { BillingCycle } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PlanInfo, PlanService } from '../plan/plan.service';
import { PlanStatus } from '../plan/plan.constants';
import { UpdateFamilyPlanDto } from './dto/update-family-plan.dto';
export interface AdminGlobalMetrics {
    totalFamilies: number;
    totalUsers: number;
    totalActiveUsers: number;
    totalExpenses: number;
    totalPaidAmount: number;
    totalPendingAmount: number;
    familiesCreatedLast30Days: number;
    usersCreatedLast30Days: number;
    premiumFamilies?: number;
    trialFamilies?: number;
    freeFamilies?: number;
}
export interface AdminLead {
    familyAccountId: string;
    familyName: string;
    ownerCpfMasked: string;
    userName: string;
    userEmail: string;
    userWhatsapp: string | null;
    userRole: string;
    isEmailVerified: boolean;
    createdAt: string;
    planStatus?: PlanStatus;
    planDaysLeft?: number | null;
    billingCycle?: BillingCycle | null;
}
export declare class AdminService {
    private readonly prisma;
    private readonly planService?;
    constructor(prisma: PrismaService, planService?: PlanService | undefined);
    getGlobalMetrics(): Promise<AdminGlobalMetrics>;
    getLeads(): Promise<AdminLead[]>;
    updateFamilyPlan(targetFamilyId: string, dto: UpdateFamilyPlanDto): Promise<PlanInfo>;
}
