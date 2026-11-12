import { BillingCycle } from '@prisma/client';
import { CheckoutPaymentMode } from '../plan.constants';
export declare class CreateCheckoutDto {
    billingCycle: BillingCycle;
    paymentMode: CheckoutPaymentMode;
    acceptedTerms: boolean;
}
