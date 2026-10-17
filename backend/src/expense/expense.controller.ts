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
import { Expense } from '@prisma/client';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FamilyScopeParam } from '../common/decorators/family-scope.decorator';
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
 * Membros secundários podem gerenciar despesas no Premium/Trial e ficam em
 * modo somente leitura no Free (via assertMemberCanWrite).
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
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @FamilyScopeParam() scope: FamilyScope,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateExpenseDto,
  ): Promise<ExpenseWithItems> {
    return this.expenseService.create(
      scope.familyAccountId,
      user.userId,
      dto,
      user.role,
    );
  }

  /**
   * Atualiza parcialmente uma despesa.
   */
  @Patch(':id')
  update(
    @FamilyScopeParam() scope: FamilyScope,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ): Promise<Expense> {
    return this.expenseService.update(
      scope.familyAccountId,
      id,
      dto,
      user.role,
    );
  }

  /**
   * Soft delete — preenche deletedAt (RN-11 / §8.7).
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @FamilyScopeParam() scope: FamilyScope,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.expenseService.softDelete(
      scope.familyAccountId,
      id,
      user.role,
    );
  }

  /**
   * Restaura uma despesa soft-deleted — limpa deletedAt (RN-11 / §8.7).
   */
  @Post(':id/restore')
  restore(
    @FamilyScopeParam() scope: FamilyScope,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<Expense> {
    return this.expenseService.restore(
      scope.familyAccountId,
      id,
      user.role,
    );
  }

  /**
   * Encerra a recorrência de uma despesa RECURRENT (RN-05 / §8.4).
   */
  @Post(':id/cancel-recurrence')
  cancelRecurrence(
    @FamilyScopeParam() scope: FamilyScope,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<Expense> {
    return this.expenseService.cancelRecurrence(
      scope.familyAccountId,
      id,
      user.role,
    );
  }
}
