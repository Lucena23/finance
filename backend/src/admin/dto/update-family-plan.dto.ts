import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { BillingCycle } from '@prisma/client';

export enum AdminPlanAction {
  GRANT_PREMIUM = 'GRANT_PREMIUM',
  EXTEND_TRIAL = 'EXTEND_TRIAL',
  REVOKE = 'REVOKE',
}

export class UpdateFamilyPlanDto {
  @IsEnum(AdminPlanAction)
  action!: AdminPlanAction;

  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  trialDays?: number;
}
