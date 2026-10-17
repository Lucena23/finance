import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlanService } from './plan.service';
export declare class PlanGuard implements CanActivate {
    private readonly reflector;
    private readonly planService;
    constructor(reflector: Reflector, planService: PlanService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
