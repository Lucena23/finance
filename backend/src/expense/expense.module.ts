import { Module } from '@nestjs/common';

import { ExpenseController } from './expense.controller';
import { ExpenseService } from './expense.service';

/**
 * ExpenseModule — CRUD de despesas e motor de geração de PaymentItems.
 * ARCHITECTURE §2 — TAREFAS 18, 19, 20, 21, 22, 23.
 */
@Module({
  controllers: [ExpenseController],
  providers: [ExpenseService],
  exports: [ExpenseService],
})
export class ExpenseModule {}
