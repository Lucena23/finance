import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * CreateCategoryDto — payload de criação de uma categoria de gastos.
 * ARCHITECTURE §3.2 — MÓDULO CATEGORIES — TAREFA 17.
 *
 * O familyAccountId NÃO é aceito aqui: o escopo é derivado exclusivamente
 * do JWT pelo FamilyScopeInterceptor (RN-01 / §8.3).
 */
export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name!: string;

  /** Cor em hexadecimal no formato #RRGGBB (ARCHITECTURE §3.1). */
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'color deve estar no formato hexadecimal #RRGGBB.',
  })
  color!: string;

  /** Nome do ícone Lucide (ex: "home", "zap"). */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  icon!: string;
}
