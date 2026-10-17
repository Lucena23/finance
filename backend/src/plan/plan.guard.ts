import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

import { AuthenticatedUser } from '../auth/jwt.strategy';
import { PremiumFeature } from './plan.constants';
import { MEMBER_WRITE_KEY, REQUIRES_PREMIUM_KEY } from './plan.decorators';
import { PlanRequiredException } from './plan-required.exception';
import { PlanService } from './plan.service';

/**
 * PlanGuard — aplica as regras Freemium declaradas por decorators.
 *
 * Registrado como APP_GUARD APÓS JwtAuthGuard e RolesGuard, portanto
 * `request.user` já está validado. Rotas sem os decorators passam direto
 * (nenhuma consulta extra ao banco).
 */
@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly planService: PlanService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];

    const feature = this.reflector.getAllAndOverride<PremiumFeature | undefined>(
      REQUIRES_PREMIUM_KEY,
      targets,
    );
    const memberWrite = this.reflector.getAllAndOverride<boolean | undefined>(
      MEMBER_WRITE_KEY,
      targets,
    );

    if (!feature && !memberWrite) {
      return true;
    }

    const user = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>().user;

    // Sem usuário (rota pública) não há plano a validar — o JwtAuthGuard
    // já protege as rotas privadas.
    if (!user) {
      return true;
    }

    if (feature) {
      await this.planService.assertPremium(user.familyAccountId, feature);
    }

    if (memberWrite && user.role === Role.MEMBER) {
      const hasAccess = await this.planService.hasPremiumAccess(user.familyAccountId);
      if (!hasAccess) {
        throw new PlanRequiredException(
          PremiumFeature.FAMILY_PLAN_EXPIRED,
          'O plano Premium da sua família expirou. Peça ao titular para assinar e liberar suas ações.',
        );
      }
    }

    return true;
  }
}
