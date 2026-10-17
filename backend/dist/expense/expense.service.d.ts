import { Expense, PaymentItem, Role } from '@prisma/client';
import { PlanService } from '../plan/plan.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
export type ExpenseWithItems = Expense & {
    paymentItems: PaymentItem[];
};
export interface PaginatedExpenses {
    data: Expense[];
    total: number;
    page: number;
}
export declare class ExpenseService {
    private readonly prisma;
    private readonly planService?;
    private static readonly RECURRENT_PROJECTION_MONTHS;
    constructor(prisma: PrismaService, planService?: PlanService | undefined);
    findAll(familyAccountId: string, query: QueryExpensesDto): Promise<PaginatedExpenses>;
    findOne(familyAccountId: string, id: string): Promise<ExpenseWithItems>;
    create(familyAccountId: string, createdById: string, dto: CreateExpenseDto, userRole?: Role): Promise<ExpenseWithItems>;
    update(familyAccountId: string, id: string, dto: UpdateExpenseDto, userRole?: Role): Promise<Expense>;
    softDelete(familyAccountId: string, id: string, userRole?: Role): Promise<void>;
    restore(familyAccountId: string, id: string, userRole?: Role): Promise<Expense>;
    cancelRecurrence(familyAccountId: string, id: string, userRole?: Role): Promise<Expense>;
    private buildPaymentItems;
    private buildSingleItems;
    private buildInstallmentItems;
    private buildRecurrentItems;
    private assertCategoryInScope;
    private findOneOrFail;
    private parseDueDate;
    private addMonths;
    private today;
}
