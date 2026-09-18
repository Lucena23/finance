import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import {
  FAMILY_SCOPE_KEY,
  FamilyScope,
} from '../interceptors/family-scope.interceptor';

/**
 * @FamilyScope() — injeta o escopo familiar (familyAccountId) no handler.
 * O valor é derivado EXCLUSIVAMENTE do JWT pelo FamilyScopeInterceptor,
 * nunca de query/body (RN-01 / §8.3). ARCHITECTURE §5.2 — TAREFA 13.
 */
export const FamilyScopeParam = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): FamilyScope => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ [FAMILY_SCOPE_KEY]?: FamilyScope }>();

    const scope = request[FAMILY_SCOPE_KEY];

    if (!scope) {
      // Invariante: o FamilyScopeInterceptor deve ter rodado antes.
      throw new Error(
        'FamilyScope indisponível: o FamilyScopeInterceptor não foi aplicado a esta rota.',
      );
    }

    return scope;
  },
);
