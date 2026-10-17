import { FamilyScope } from '../common/interceptors/family-scope.interceptor';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { PayItemDto } from './dto/pay-item.dto';
import { QueryHistoryDto } from './dto/query-history.dto';
import { QueryPaymentItemsDto } from './dto/query-payment-items.dto';
import { UpdatePaymentItemDto } from './dto/update-payment-item.dto';
import { PaginatedHistory, PaymentItemService, PaymentItemWithPayer, PaymentQueue } from './payment-item.service';
import { PaymentItem } from '@prisma/client';
export declare class PaymentItemController {
    private readonly paymentItemService;
    constructor(paymentItemService: PaymentItemService);
    getQueue(scope: FamilyScope, query: QueryPaymentItemsDto): Promise<PaymentQueue>;
    getHistory(scope: FamilyScope, query: QueryHistoryDto): Promise<PaginatedHistory>;
    pay(scope: FamilyScope, user: AuthenticatedUser, id: string, dto: PayItemDto): Promise<PaymentItemWithPayer>;
    undoPay(scope: FamilyScope, id: string): Promise<PaymentItem>;
    updateExpectedAmount(scope: FamilyScope, id: string, dto: UpdatePaymentItemDto): Promise<PaymentItem>;
}
