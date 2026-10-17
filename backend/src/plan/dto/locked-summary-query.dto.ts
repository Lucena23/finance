import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

/** Período obrigatório para o resumo de mês bloqueado. */
export class LockedSummaryQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;
}
