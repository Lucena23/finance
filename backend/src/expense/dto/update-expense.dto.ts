import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * UpdateExpenseDto — payload de atualização parcial de uma despesa.
 * ARCHITECTURE §3.2 — MÓDULO EXPENSES — TAREFA 18.
 *
 * RN-04 / §8.2: `totalAmount` é um inteiro em CENTAVOS.
 * Para despesas RECURRENT, a alteração de `totalAmount` reflete apenas em
 * PaymentItems futuros (RN-05 / §8.4) — tratado no ExpenseService.
 */
export class UpdateExpenseDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID('4', { message: 'categoryId deve ser um UUID válido.' })
  categoryId?: string;

  /** Valor total em centavos (Int). Ex: 15075 = R$ 150,75 (RN-04 / §8.2). */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'totalAmount deve ser um inteiro em centavos.' })
  @Min(1, { message: 'totalAmount deve ser maior que zero.' })
  totalAmount?: number;
}
