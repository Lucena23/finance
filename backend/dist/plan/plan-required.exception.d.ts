import { HttpException } from '@nestjs/common';
import { PremiumFeature } from './plan.constants';
export declare class PlanRequiredException extends HttpException {
    constructor(feature: PremiumFeature, message: string);
}
