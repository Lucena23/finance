import { FamilyScope } from '../common/interceptors/family-scope.interceptor';
import { LockedSummaryQueryDto } from './dto/locked-summary-query.dto';
import { LockedMonthSummary, PlanInfo, PlanService } from './plan.service';
export declare class PlanController {
    private readonly planService;
    constructor(planService: PlanService);
    getPlan(scope: FamilyScope): Promise<PlanInfo>;
    getLockedSummary(scope: FamilyScope, query: LockedSummaryQueryDto): Promise<LockedMonthSummary>;
}
