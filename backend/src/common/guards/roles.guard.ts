import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

import { AuthenticatedUser } from '../../auth/jwt.strategy';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * RolesGuard — valida o papel do usuário autenticado (ADMIN | MEMBER).
 * RN-03: apenas ADMIN pode gerenciar membros, categorias e configurações.
 * ARCHITECTURE §5.2 — TAREFA 12.
 *
 * Deve ser aplicado APÓS o JwtAuthGuard, garantindo que request.user exista.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Rota sem @Roles() → acesso liberado a qualquer usuário autenticado.
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();

    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado.');
    }

    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) {
      throw new ForbiddenException(
        'Acesso negado: permissão insuficiente para esta operação.',
      );
    }

    return true;
  }
}
