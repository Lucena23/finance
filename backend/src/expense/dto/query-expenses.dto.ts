import { ExpenseType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

/**
 * QueryExpensesDto — filtros e paginação da listagem de despesas.
 * ARCHITECTURE §3.2 — MÓDULO EXPENSES — TAREFA 18.
 */
export class QueryExpensesDto {
  @IsOptional()
  @IsEnum(ExpenseType)
  type?: ExpenseType;

  @IsOptional()
  @IsUUID('4', { message: 'categoryId deve ser um UUID válido.' })
  categoryId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
