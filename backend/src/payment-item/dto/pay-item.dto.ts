import { Type } from 'class-transformer';
import {
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * PayItemDto — payload de quitação de um PaymentItem.
 * ARCHITECTURE §3.2 — MÓDULO PAYMENT ITEMS — TAREFA 25.
 *
 * RN-04 / §8.2: `paidAmount` é um inteiro em CENTAVOS (ex: 15075 = R$ 150,75).
 * É ESTRITAMENTE PROIBIDO o uso de ponto flutuante para valores monetários.
 *
 * RN-07: a quitação grava paidAmount, paidAt e paidById (derivado do JWT) e
 * transiciona o status PENDING → PAID de forma irreversível.
 */
export class PayItemDto {
  /** Valor efetivamente pago, em centavos (Int). Deve ser > 0 (RN-07). */
  @Type(() => Number)
  @IsInt({ message: 'paidAmount deve ser um inteiro em centavos.' })
  @Min(1, { message: 'paidAmount deve ser maior que zero.' })
  paidAmount!: number;

  /** Timestamp da baixa (ISO 8601). */
  @IsISO8601(
    { strict: true },
    { message: 'paidAt deve estar no formato ISO 8601.' },
  )
  paidAt!: string;

  /** Observação livre de quitação (comprovante, juros, etc.). Opcional. */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
