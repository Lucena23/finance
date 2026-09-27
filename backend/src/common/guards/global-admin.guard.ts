import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuthenticatedUser } from '../../auth/jwt.strategy';
import { GLOBAL_ADMIN_KEY } from '../decorators/global-admin.decorator';

/**
 * GlobalAdminGuard — protege as rotas do Painel Aksurim (RN-15 / TAREFA 25).
 *
 * Valida que o usuário autenticado possui `isGlobalAdmin === true`.
 *
 * IMPORTANTE (RN-15): NÃO confundir com `Role.ADMIN`, que é o chefe de família
 * e permanece restrito ao seu próprio workspace. A flag `isGlobalAdmin` é o
 * ÚNICO critério válido para acesso global cross-tenant.
 *
 * Deve ser aplicado APÓS o JwtAuthGuard, garantindo que request.user exista.
 * O `isGlobalAdmin` é revalidado no banco a cada requisição pelo JwtStrategy,
 * portanto não pode ser forjado via token antigo.
 */
@Injectable()
export class GlobalAdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isGlobalAdminRoute = this.reflector.getAllAndOverride<boolean>(
      GLOBAL_ADMIN_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Rota sem @GlobalAdminOnly() → o guard não interfere.
    if (isGlobalAdminRoute !== true) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();

    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado.');
    }

    if (user.isGlobalAdmin !== true) {
      throw new ForbiddenException(
        'Acesso negado: esta área é exclusiva do Painel Aksurim (Admin Global).',
      );
    }

    return true;
  }
}
