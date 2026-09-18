import { Module } from '@nestjs/common';

import { PaymentItemController } from './payment-item.controller';
import { PaymentItemService } from './payment-item.service';

/**
 * PaymentItemModule — Fila de pagamentos, quitação e ordenação por urgência.
 * ARCHITECTURE §2 — TAREFA 24.
 */
@Module({
  controllers: [PaymentItemController],
  providers: [PaymentItemService],
  exports: [PaymentItemService],
})
export class PaymentItemModule {}
