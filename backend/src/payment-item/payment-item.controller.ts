import { Controller, Get, Query } from '@nestjs/common';

import { FamilyScopeParam } from '../common/decorators/family-scope.decorator';
import { FamilyScope } from '../common/interceptors/family-scope.interceptor';
import { QueryPaymentItemsDto } from './dto/query-payment-items.dto';
import { PaymentItemService, PaymentQueue } from './payment-item.service';

/**
 * PaymentItemController — Fila de Pagamentos.
 * ARCHITECTURE §3.2 — MÓDULO PAYMENT ITEMS — TAREFA 24.
 *
 * O familyAccountId é SEMPRE derivado do JWT via FamilyScopeInterceptor
 * (RN-01 / §8.3) — nunca aceito como parâmetro de query/body.
 */
@Controller('payment-items')
export class PaymentItemController {
  constructor(private readonly paymentItemService: PaymentItemService) {}

  /**
   * Retorna a fila de pagamentos pendentes do workspace, ordenada por urgência
   * (atraso → mês atual → futuros → dueDate ASC) — RN-06 / §8.5.
   * Acessível a ADMIN e MEMBER (RN-03).
   */
  @Get('queue')
  getQueue(
    @FamilyScopeParam() scope: FamilyScope,
    @Query() query: QueryPaymentItemsDto,
  ): Promise<PaymentQueue> {
    return this.paymentItemService.getQueue(scope.familyAccountId, query);
  }
}
