import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
} from '@nestjs/common';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FamilyScopeParam } from '../common/decorators/family-scope.decorator';
import { FamilyScope } from '../common/interceptors/family-scope.interceptor';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { PayItemDto } from './dto/pay-item.dto';
import { QueryHistoryDto } from './dto/query-history.dto';
import { QueryPaymentItemsDto } from './dto/query-payment-items.dto';
import { UpdatePaymentItemDto } from './dto/update-payment-item.dto';
import {
  PaginatedHistory,
  PaymentItemService,
  PaymentQueue,
} from './payment-item.service';
import { PaymentItem } from '@prisma/client';

/**
 * PaymentItemController — Fila de Pagamentos, quitação e histórico.
 * ARCHITECTURE §3.2 — MÓDULO PAYMENT ITEMS — TAREFAS 24, 25, 26, 27.
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

  /**
   * Histórico de pagamentos já quitados com badge do pagador (RN-08 — TAREFA 27).
   * Acessível a ADMIN e MEMBER (RN-03).
   */
  @Get('history')
  getHistory(
    @FamilyScopeParam() scope: FamilyScope,
    @Query() query: QueryHistoryDto,
  ): Promise<PaginatedHistory> {
    return this.paymentItemService.getHistory(scope.familyAccountId, query);
  }

  /**
   * Quita um PaymentItem (RN-07 — TAREFA 25).
   * Acessível a ADMIN e MEMBER (RN-03): qualquer membro pode registrar baixa.
   */
  @Patch(':id/pay')
  pay(
    @FamilyScopeParam() scope: FamilyScope,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: PayItemDto,
  ): Promise<PaymentItem> {
    return this.paymentItemService.pay(
      scope.familyAccountId,
      id,
      user.userId,
      dto,
    );
  }

  /**
   * Ajuste fino do valor previsto de uma parcela (TAREFA 26).
   * Acessível a ADMIN e MEMBER (RN-03).
   */
  @Patch(':id')
  updateExpectedAmount(
    @FamilyScopeParam() scope: FamilyScope,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentItemDto,
  ): Promise<PaymentItem> {
    return this.paymentItemService.updateExpectedAmount(
      scope.familyAccountId,
      id,
      dto,
    );
  }
}
