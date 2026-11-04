export declare const PAYMENT_DIFFERENCE_HANDLINGS: readonly ["PARTIAL", "DISCOUNT", "INTEREST", "READJUSTMENT"];
export type PaymentDifferenceHandling = (typeof PAYMENT_DIFFERENCE_HANDLINGS)[number];
export declare class PayItemDto {
    paidAmount: number;
    paidAt: string;
    notes?: string;
    differenceHandling?: PaymentDifferenceHandling;
}
