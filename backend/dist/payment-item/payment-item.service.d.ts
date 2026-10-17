import { PaymentItem } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PlanService } from '../plan/plan.service';
import { PayItemDto } from './dto/pay-item.dto';
import { QueryHistoryDto } from './dto/query-history.dto';
import { QueryPaymentItemsDto } from './dto/query-payment-items.dto';
import { UpdatePaymentItemDto } from './dto/update-payment-item.dto';
export type PaymentItemWithPayer = PaymentItem & {
    paidBy: {
        initials: string;
        avatarColor: string;
    } | null;
};
export interface PaymentQueue {
    overdue: PaymentItemWithPayer[];
    currentMonth: PaymentItemWithPayer[];
    upcoming: PaymentItemWithPayer[];
}
export interface PaginatedHistory {
    data: PaymentItemWithPayer[];
    total: number;
    page: number;
}
export declare class PaymentItemService {
    private readonly prisma;
    private readonly planService?;
    constructor(prisma: PrismaService, planService?: PlanService | undefined);
    getQueue(familyAccountId: string, query: QueryPaymentItemsDto): Promise<PaymentQueue>;
    pay(familyAccountId: string, id: string, paidById: string, dto: PayItemDto): Promise<PaymentItemWithPayer>;
    undoPay(familyAccountId: string, id: string): Promise<PaymentItem>;
    updateExpectedAmount(familyAccountId: string, id: string, dto: UpdatePaymentItemDto): Promise<PaymentItem>;
    getHistory(familyAccountId: string, query: QueryHistoryDto): Promise<PaginatedHistory>;
    private findItemInScope;
    private buildPaidAtRange;
    private resolveReferencePeriod;
    private parsePaidAt;
    private normalizeDate;
    private today;
}
