import { Response } from 'express';
import { AdminGlobalMetrics, AdminLead, AdminService } from './admin.service';
import { LeadExportService } from './lead-export.service';
import { UpdateFamilyPlanDto } from './dto/update-family-plan.dto';
import { AdminRefundDto } from '../plan/dto/admin-refund.dto';
import { AdminTransactionView, PlanPaymentService } from '../plan/plan-payment.service';
import { PlanInfo } from '../plan/plan.service';
export declare class AdminController {
    private readonly adminService;
    private readonly leadExportService;
    private readonly planPaymentService?;
    constructor(adminService: AdminService, leadExportService: LeadExportService, planPaymentService?: PlanPaymentService | undefined);
    getMetrics(): Promise<AdminGlobalMetrics>;
    getLeads(): Promise<AdminLead[]>;
    updateFamilyPlan(id: string, dto: UpdateFamilyPlanDto): Promise<PlanInfo>;
    getTransactions(): Promise<AdminTransactionView[]>;
    refundTransaction(id: string, dto: AdminRefundDto): Promise<{
        refunded: boolean;
        refundedAmountCents: number;
        plan: PlanInfo;
    }>;
    exportLeads(format: string | undefined, res: Response): Promise<void>;
}
