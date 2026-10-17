import { HttpException, HttpStatus } from '@nestjs/common';

import { PLAN_REQUIRED_CODE, PremiumFeature } from './plan.constants';

/**
 * PlanRequiredException — HTTP 402 (Payment Required).
 *
 * Corpo padronizado consumido pelo frontend para abrir o modal Premium:
 * { statusCode: 402, code: 'PLAN_REQUIRED', feature, message }
 */
export class PlanRequiredException extends HttpException {
  constructor(feature: PremiumFeature, message: string) {
    super(
      {
        statusCode: HttpStatus.PAYMENT_REQUIRED,
        code: PLAN_REQUIRED_CODE,
        feature,
        message,
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}
