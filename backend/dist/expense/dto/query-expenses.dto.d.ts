import { ExpenseType } from '@prisma/client';
export declare class QueryExpensesDto {
    type?: ExpenseType;
    categoryId?: string;
    page?: number;
    limit?: number;
}
