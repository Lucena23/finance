import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class AdminRefundDto {
  @IsOptional()
  @IsInt({ message: 'O valor do estorno deve ser um inteiro em centavos.' })
  @Min(1, { message: 'O valor mínimo de estorno é 1 centavo.' })
  amountCents?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
