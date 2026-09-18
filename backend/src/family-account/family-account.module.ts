import { Module } from '@nestjs/common';

import { FamilyAccountController } from './family-account.controller';
import { FamilyAccountService } from './family-account.service';

/**
 * FamilyAccountModule — gestão do workspace familiar (RN-01 / RN-02).
 * ARCHITECTURE §2 — TAREFA 15.
 */
@Module({
  controllers: [FamilyAccountController],
  providers: [FamilyAccountService],
  exports: [FamilyAccountService],
})
export class FamilyAccountModule {}
