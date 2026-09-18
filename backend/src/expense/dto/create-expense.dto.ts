import { ExpenseType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

/**
 * CreateExpenseDto — payload de criação de uma despesa.
 * ARCHITECTURE §3.2 — MÓDULO EXPENSES — TAREFA 18.
 *
 * O familyAccountId NÃO é aceito aqui: o escopo é derivado exclusivamente
 * do JWT pelo FamilyScopeInterceptor (RN-01 / §8.3).
 *
 * RN-04 / §8.2: `totalAmount` é um inteiro em CENTAVOS (ex: 15075 = R$ 150,75).
 * É ESTRITAMENTE PROIBIDO o uso de ponto flutuante para valores monetários.
 */
export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ExpenseType)
  type!: ExpenseType;

  /** Valor total em centavos (Int). Ex: 15075 = R$ 150,75 (RN-04 / §8.2). */
  @Type(() => Number)
  @IsInt({ message: 'totalAmount deve ser um inteiro em centavos.' })
  @Min(1, { message: 'totalAmount deve ser maior que zero.' })
  totalAmount!: number;

  @IsUUID('4', { message: 'categoryId deve ser um UUID válido.' })
  categoryId!: string;

  /**
   * Vencimento (ISO 8601). Obrigatório para SINGLE e para o primeiro
   * vencimento de INSTALLMENT/RECURRENT (ARCHITECTURE §3.2).
   */
  @IsISO8601(
    { strict: true },
    { message: 'dueDate deve estar no formato ISO 8601.' },
  )
  dueDate!: string;

  /**
   * Quantidade de parcelas. Obrigatório (min: 2) apenas para INSTALLMENT.
   * Ignorado para SINGLE e RECURRENT (RN-05 / §8.4).
   */
  @ValidateIf((dto: CreateExpenseDto) => dto.type === ExpenseType.INSTALLMENT)
  @Type(() => Number)
  @IsInt({ message: 'totalInstallments deve ser um inteiro.' })
  @Min(2, { message: 'totalInstallments deve ser no mínimo 2.' })
  totalInstallments?: number;
}
