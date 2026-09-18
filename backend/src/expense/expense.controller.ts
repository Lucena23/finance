import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Expense, Role } from '@prisma/client';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FamilyScopeParam } from '../common/decorators/family-scope.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { FamilyScope } from '../common/interceptors/family-scope.interceptor';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import {
  ExpenseService,
  ExpenseWithItems,
  PaginatedExpenses,
} from './expense.service';

/**
 * ExpenseController — CRUD de despesas e geração de PaymentItems.
 * ARCHITECTURE §3.2 — MÓDULO EXPENSES — TAREFAS 18, 19, 20, 21, 22, 23.
 *
 * O familyAccountId é SEMPRE derivado do JWT via FamilyScopeInterceptor
 * (RN-01 / §8.3) — nunca aceito como parâmetro de query/body.
 * Escrita (POST/PATCH/DELETE) restrita a ADMIN (RN-03).
 */
@Controller('expenses')
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  /**
   * Lista despesas ativas do workspace (filtra deletedAt IS NULL — RN-11).
   * Acessível a ADMIN e MEMBER (RN-03).
   */
  @Get()
  findAll(
    @FamilyScopeParam() scope: FamilyScope,
    @Query() query: QueryExpensesDto,
  ): Promise<PaginatedExpenses> {
    return this.expenseService.findAll(scope.familyAccountId, query);
  }

  /**
   * Detalhe de uma despesa com seus PaymentItems.
   */
  @Get(':id')
  findOne(
    @FamilyScopeParam() scope: FamilyScope,
    @Param('id') id: string,
  ): Promise<ExpenseWithItems> {
    return this.expenseService.findOne(scope.familyAccountId, id);
  }

  /**
   * Cria uma despesa e gera os PaymentItems conforme o tipo (RN-05 / §8.4).
   * Requer ADMIN (RN-03).
   */
  @Roles(Role.ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @FamilyScopeParam() scope: FamilyScope,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateExpenseDto,
  ): Promise<ExpenseWithItems> {
    return this.expenseService.create(scope.familyAccountId, user.userId, dto);
  }

  /**
   * Atualiza parcialmente uma despesa. Requer ADMIN (RN-03).
   */
  @Roles(Role.ADMIN)
  @Patch(':id')
  update(
    @FamilyScopeParam() scope: FamilyScope,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ): Promise<Expense> {
    return this.expenseService.update(scope.familyAccountId, id, dto);
  }

  /**
   * Soft delete — preenche deletedAt (RN-11 / §8.7). Requer ADMIN (RN-03).
   */
  @Roles(Role.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @FamilyScopeParam() scope: FamilyScope,
    @Param('id') id: string,
  ): Promise<void> {
    return this.expenseService.softDelete(scope.familyAccountId, id);
  }

  /**
   * Restaura uma despesa soft-deleted — limpa deletedAt (RN-11 / §8.7).
   * Requer ADMIN (RN-03).
   */
  @Roles(Role.ADMIN)
  @Post(':id/restore')
  restore(
    @FamilyScopeParam() scope: FamilyScope,
    @Param('id') id: string,
  ): Promise<Expense> {
    return this.expenseService.restore(scope.familyAccountId, id);
  }

  /**
   * Encerra a recorrência de uma despesa RECURRENT (RN-05 / §8.4).
   * Requer ADMIN (RN-03).
   */
  @Roles(Role.ADMIN)
  @Post(':id/cancel-recurrence')
  cancelRecurrence(
    @FamilyScopeParam() scope: FamilyScope,
    @Param('id') id: string,
  ): Promise<Expense> {
    return this.expenseService.cancelRecurrence(scope.familyAccountId, id);
  }
}
