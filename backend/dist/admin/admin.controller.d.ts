import { Response } from 'express';
import { AdminGlobalMetrics, AdminLead, AdminService } from './admin.service';
import { LeadExportService } from './lead-export.service';
import { UpdateFamilyPlanDto } from './dto/update-family-plan.dto';
import { PlanInfo } from '../plan/plan.service';
export declare class AdminController {
    private readonly adminService;
    private readonly leadExportService;
    constructor(adminService: AdminService, leadExportService: LeadExportService);
    getMetrics(): Promise<AdminGlobalMetrics>;
    getLeads(): Promise<AdminLead[]>;
    updateFamilyPlan(id: string, dto: UpdateFamilyPlanDto): Promise<PlanInfo>;
    exportLeads(format: string | undefined, res: Response): Promise<void>;
}
