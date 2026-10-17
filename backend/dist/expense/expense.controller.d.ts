import { Expense } from '@prisma/client';
import { FamilyScope } from '../common/interceptors/family-scope.interceptor';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseService, ExpenseWithItems, PaginatedExpenses } from './expense.service';
export declare class ExpenseController {
    private readonly expenseService;
    constructor(expenseService: ExpenseService);
    findAll(scope: FamilyScope, query: QueryExpensesDto): Promise<PaginatedExpenses>;
    findOne(scope: FamilyScope, id: string): Promise<ExpenseWithItems>;
    create(scope: FamilyScope, user: AuthenticatedUser, dto: CreateExpenseDto): Promise<ExpenseWithItems>;
    update(scope: FamilyScope, user: AuthenticatedUser, id: string, dto: UpdateExpenseDto): Promise<Expense>;
    remove(scope: FamilyScope, user: AuthenticatedUser, id: string): Promise<void>;
    restore(scope: FamilyScope, user: AuthenticatedUser, id: string): Promise<Expense>;
    cancelRecurrence(scope: FamilyScope, user: AuthenticatedUser, id: string): Promise<Expense>;
}
