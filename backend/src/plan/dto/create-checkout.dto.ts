import { BillingCycle } from '@prisma/client';
import { IsBoolean, IsEnum, IsIn } from 'class-validator';

import { CheckoutPaymentMode } from '../plan.constants';

export class CreateCheckoutDto {
  @IsEnum(BillingCycle, { message: 'Ciclo de cobrança inválido.' })
  billingCycle!: BillingCycle;

  @IsIn(['CARD_RECURRING', 'PIX_ONCE', 'CHECKOUT_PRO'], {
    message: 'Modalidade de pagamento inválida.',
  })
  paymentMode!: CheckoutPaymentMode;

  @IsBoolean({ message: 'É obrigatório aceitar os Termos de Uso e a Política de Reembolso.' })
  acceptedTerms!: boolean;
}
