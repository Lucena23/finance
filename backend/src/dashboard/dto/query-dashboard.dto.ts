import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * QueryDashboardDto — filtros de período do painel gerencial.
 * ARCHITECTURE §3.2 — MÓDULO DASHBOARD — TAREFA 28.
 *
 * O familyAccountId NÃO é aceito aqui: o escopo é derivado exclusivamente
 * do JWT pelo FamilyScopeInterceptor (RN-01 / §8.3).
 */
export class QueryDashboardDto {
  /** Mês de referência (1-12). Opcional — padrão: mês corrente. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  /** Ano de referência (ex: 2026). Opcional — padrão: ano corrente. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  year?: number;
}
