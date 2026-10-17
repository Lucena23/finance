import { SetMetadata } from '@nestjs/common';

import { PremiumFeature } from './plan.constants';

export const REQUIRES_PREMIUM_KEY = 'requiresPremium';
export const MEMBER_WRITE_KEY = 'memberWriteRequiresPlan';

/**
 * Marca a rota como exclusiva do Premium (TRIAL, PREMIUM ou GRACE).
 * Validada pelo PlanGuard global — resposta 402 quando a família está no Free.
 */
export const RequiresPremium = (feature: PremiumFeature): MethodDecorator & ClassDecorator =>
  SetMetadata(REQUIRES_PREMIUM_KEY, feature);

/**
 * Marca uma ação de ESCRITA que membros (Role.MEMBER) só podem executar
 * enquanto a família tiver Premium ativo. O titular (ADMIN) não é afetado.
 */
export const MemberWriteRequiresPlan = (): MethodDecorator & ClassDecorator =>
  SetMetadata(MEMBER_WRITE_KEY, true);
