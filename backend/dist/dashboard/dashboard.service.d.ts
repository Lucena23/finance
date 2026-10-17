import { PrismaService } from '../prisma/prisma.service';
import { PlanService } from '../plan/plan.service';
import { QueryDashboardDto } from './dto/query-dashboard.dto';
export interface MemberBreakdown {
    userId: string;
    name: string;
    initials: string;
    avatarColor: string;
    totalPaid: number;
}
export interface DashboardSummary {
    totalPaidMonth: number;
    totalPendingMonth: number;
    memberBreakdown: MemberBreakdown[];
}
export interface CategoryDistribution {
    categoryId: string;
    name: string;
    color: string;
    totalAmount: number;
    percentage: number;
}
export declare class DashboardService {
    private readonly prisma;
    private readonly planService?;
    constructor(prisma: PrismaService, planService?: PlanService | undefined);
    getSummary(familyAccountId: string, query: QueryDashboardDto): Promise<DashboardSummary>;
    getCategoryDistribution(familyAccountId: string, query: QueryDashboardDto): Promise<CategoryDistribution[]>;
    getMonthlyEvolution(familyAccountId: string, query: QueryDashboardDto): Promise<{
        month: number;
        totalPaid: number;
        totalPending: number;
    }[]>;
    private resolveReferencePeriod;
    private endOfDay;
    private roundPercentage;
}
