import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { AuthenticatedUser } from '../../auth/jwt.strategy';

/**
 * @CurrentUser() — injeta o usuário autenticado (request.user) no handler.
 * O usuário é derivado exclusivamente do JWT validado pelo JwtStrategy.
 * ARCHITECTURE §5.2 — TAREFA 14.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    return request.user;
  },
);
