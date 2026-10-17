import { ExpenseType } from '@prisma/client';
export declare class CreateExpenseDto {
    title: string;
    description?: string;
    type: ExpenseType;
    totalAmount: number;
    categoryId: string;
    dueDate: string;
    totalInstallments?: number;
}
