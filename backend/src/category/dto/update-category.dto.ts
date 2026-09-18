import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * UpdateCategoryDto — payload de atualização parcial de uma categoria.
 * ARCHITECTURE §3.2 — MÓDULO CATEGORIES — TAREFA 17.
 */
export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name?: string;

  /** Cor em hexadecimal no formato #RRGGBB (ARCHITECTURE §3.1). */
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'color deve estar no formato hexadecimal #RRGGBB.',
  })
  color?: string;

  /** Nome do ícone Lucide (ex: "home", "zap"). */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  icon?: string;
}
