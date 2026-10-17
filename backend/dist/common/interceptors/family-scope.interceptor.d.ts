import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
export declare const FAMILY_SCOPE_KEY = "familyScope";
export interface FamilyScope {
    familyAccountId: string;
    bypass: boolean;
}
export declare class FamilyScopeInterceptor implements NestInterceptor {
    private readonly reflector;
    constructor(reflector: Reflector);
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown>;
    private shouldBypassFamilyScope;
    private assertNoClientSuppliedScope;
}
