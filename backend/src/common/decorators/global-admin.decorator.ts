import { SetMetadata } from '@nestjs/common';

/**
 * Chave de metadata para rotas exclusivas do Aksurim Admin Global (RN-15).
 */
export const GLOBAL_ADMIN_KEY = 'isGlobalAdminRoute';

/**
 * @GlobalAdminOnly() — marca uma rota como pertencente ao Painel Aksurim
 * (acesso global, cross-tenant). Consumido por:
 *  - FamilyScopeInterceptor: permite o bypass do escopo familiar APENAS
 *    quando o usuário autenticado possui `isGlobalAdmin = true`.
 *  - GlobalAdminGuard: bloqueia (403) qualquer usuário sem a flag.
 *
 * IMPORTANTE (RN-15): NÃO confundir com `Role.ADMIN`, que é o chefe de
 * família e permanece restrito ao seu próprio workspace.
 */
export const GlobalAdminOnly = () => SetMetadata(GLOBAL_ADMIN_KEY, true);
