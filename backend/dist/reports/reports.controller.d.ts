import { Response } from 'express';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { FamilyScope } from '../common/interceptors/family-scope.interceptor';
import { PlanService } from '../plan/plan.service';
import { ReportsService } from './reports.service';
export declare class ReportsController {
    private readonly reportsService;
    private readonly planService?;
    constructor(reportsService: ReportsService, planService?: PlanService | undefined);
    generatePdfReport(user: any, startDate: string, endDate: string, type: 'sintetico' | 'analitico', res: Response): Promise<void>;
    exportCsv(scope: FamilyScope, user: AuthenticatedUser, res: Response): Promise<void>;
}
