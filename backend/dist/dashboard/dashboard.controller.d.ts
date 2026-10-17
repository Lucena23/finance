import { FamilyScope } from '../common/interceptors/family-scope.interceptor';
import { CategoryDistribution, DashboardService, DashboardSummary } from './dashboard.service';
import { QueryDashboardDto } from './dto/query-dashboard.dto';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
    getSummary(scope: FamilyScope, query: QueryDashboardDto): Promise<DashboardSummary>;
    getCategoryDistribution(scope: FamilyScope, query: QueryDashboardDto): Promise<CategoryDistribution[]>;
    getMonthlyEvolution(scope: FamilyScope, query: QueryDashboardDto): Promise<{
        month: number;
        totalPaid: number;
        totalPending: number;
    }[]>;
}
