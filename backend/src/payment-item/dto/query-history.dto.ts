import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

/**
 * QueryHistoryDto — filtros do histórico de pagamentos quitados.
 * ARCHITECTURE §3.2 — MÓDULO PAYMENT ITEMS — TAREFA 27.
 *
 * O familyAccountId NÃO é aceito aqui: o escopo é derivado exclusivamente
 * do JWT pelo FamilyScopeInterceptor (RN-01 / §8.3).
 */
export class QueryHistoryDto {
  /** Mês de referência (1-12). Opcional. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  /** Ano de referência (ex: 2026). Opcional. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  year?: number;

  /** Filtro por membro pagador (RN-08). Opcional. */
  @IsOptional()
  @IsUUID('4', { message: 'paidById deve ser um UUID válido.' })
  paidById?: string;

  /** Filtro por categoria. Opcional. */
  @IsOptional()
  @IsUUID('4', { message: 'categoryId deve ser um UUID válido.' })
  categoryId?: string;

  /** Página (1-indexed). Padrão: 1. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  /** Itens por página. Padrão: 20. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
