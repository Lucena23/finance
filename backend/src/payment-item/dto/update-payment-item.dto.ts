import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

/**
 * UpdatePaymentItemDto — ajuste fino do valor previsto de uma parcela.
 * ARCHITECTURE §3.2 — MÓDULO PAYMENT ITEMS — TAREFA 26.
 *
 * RN-04 / §8.2: `expectedAmount` é um inteiro em CENTAVOS (Int).
 * Apenas itens com status PENDING podem ser ajustados.
 */
export class UpdatePaymentItemDto {
  /** Novo valor previsto, em centavos (Int). Deve ser > 0. */
  @Type(() => Number)
  @IsInt({ message: 'expectedAmount deve ser um inteiro em centavos.' })
  @Min(1, { message: 'expectedAmount deve ser maior que zero.' })
  expectedAmount!: number;
}
