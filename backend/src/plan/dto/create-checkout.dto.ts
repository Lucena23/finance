import { BillingCycle } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

import { CheckoutPaymentMode } from '../plan.constants';

export class CreateCheckoutDto {
  @IsEnum(BillingCycle, { message: 'Ciclo de cobrança inválido.' })
  billingCycle!: BillingCycle;

  @IsIn(
    ['PIX_DIRECT', 'CARD_DIRECT', 'CARD_RECURRING', 'PIX_ONCE', 'CHECKOUT_PRO'],
    {
      message: 'Modalidade de pagamento inválida.',
    },
  )
  paymentMode!: CheckoutPaymentMode;

  @IsBoolean({
    message:
      'É obrigatório aceitar os Termos de Uso e a Política de Reembolso.',
  })
  acceptedTerms!: boolean;

  /**
   * Token descartável de uso único gerado diretamente no navegador via cofre PCI-DSS
   * do Mercado Pago (`POST /v1/card_tokens`). Dados brutos do cartão NUNCA trafegam pelo backend.
   */
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]{16,128}$/, {
    message: 'Token criptográfico do cartão inválido.',
  })
  cardToken?: string;

  /** Identificador da bandeira no Mercado Pago (`visa`, `master`, `elo`, `amex`, `hipercard`). */
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9_]{2,32}$/i, {
    message: 'Bandeira do cartão inválida.',
  })
  paymentMethodId?: string;

  /** Emissor do cartão (opcional, retornado pelo Mercado Pago). */
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{1,20}$/, {
    message: 'Identificador do emissor inválido.',
  })
  issuerId?: string;

  /** Quantidade de parcelas (1 no Mensal, até 6 no Semestral, até 12 no Anual). */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  installments?: number;

  /** CPF do titular do cartão ou pagador (somente números ou formatado). */
  @IsOptional()
  @IsString()
  @Matches(/^[0-9.\-]{11,14}$/, {
    message: 'CPF informado em formato inválido.',
  })
  payerCpf?: string;
}
