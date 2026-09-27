import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

import { AuthenticatedUser } from '../../auth/jwt.strategy';
import { GLOBAL_ADMIN_KEY } from '../decorators/global-admin.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Chave sob a qual o escopo familiar é anexado ao request.
 * Consumida pelos services via `@FamilyScope()` ou `request.familyScope`.
 */
export const FAMILY_SCOPE_KEY = 'familyScope';

/**
 * Escopo familiar derivado exclusivamente do JWT autenticado.
 * NUNCA deve ser aceito como parâmetro de query ou body (RN-01 / §8.3).
 *
 * `bypass` indica que o escopo familiar foi intencionalmente ignorado por se
 * tratar de uma rota do Painel Aksurim acessada por um Admin Global (RN-15).
 * Nesse caso `familyAccountId` é uma string vazia e os services do Admin
 * Global DEVEM operar de forma cross-tenant de maneira EXPLÍCITA, checando
 * `scope.bypass` antes de usar `familyAccountId`.
 */
export interface FamilyScope {
  familyAccountId: string;
  bypass: boolean;
}

/**
 * Campos proibidos em query/body — o escopo é sempre derivado do token.
 * Qualquer tentativa de injetá-los é tratada como vulnerabilidade crítica.
 */
const FORBIDDEN_SCOPE_FIELDS = [
  'familyAccountId',
  'familyAccountID',
  'family_account_id',
];

/**
 * FamilyScopeInterceptor — Isolamento Multi-Tenant (RN-01 / §8.3).
 * ARCHITECTURE §5.2 — TAREFA 13. Bypass condicional — TAREFA 24 / RN-15.
 *
 * Responsabilidades:
 *  1. Extrair `familyAccountId` EXCLUSIVAMENTE do JWT (request.user).
 *  2. Injetar o escopo em `request.familyScope` para uso obrigatório nas queries.
 *  3. Rejeitar (400) qualquer requisição que tente fornecer `familyAccountId`
 *     via query string ou body — o escopo nunca é parametrizável pelo cliente.
 *  4. (RN-15) Permitir o bypass do escopo familiar SOMENTE em rotas marcadas
 *     com `@GlobalAdminOnly()` E quando o usuário autenticado possuir
 *     `isGlobalAdmin === true`. Em qualquer outro caso o escopo é aplicado
 *     normalmente — o bypass NUNCA é acionado por Role.ADMIN.
 *
 * Deve ser aplicado APÓS o JwtAuthGuard, garantindo que request.user exista.
 * Rotas marcadas com @Public() (login/register) são ignoradas — não há escopo
 * familiar a derivar antes da autenticação.
 */
@Injectable()
export class FamilyScopeInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Rotas públicas (login/register) não possuem escopo familiar.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      query?: Record<string, unknown>;
      body?: Record<string, unknown>;
      params?: Record<string, unknown>;
      [FAMILY_SCOPE_KEY]?: FamilyScope;
    }>();

    // 1. Bloqueia tentativas de parametrizar o escopo pelo cliente.
    this.assertNoClientSuppliedScope(request);

    // 2. Deriva o escopo exclusivamente do JWT validado.
    const user = request.user;

    if (!user) {
      // Sem usuário autenticado não há escopo — o JwtAuthGuard já deve ter
      // barrado rotas protegidas; aqui garantimos a invariante de segurança.
      throw new BadRequestException(
        'Escopo familiar indisponível: usuário não autenticado.',
      );
    }

    // 3. (RN-15) Bypass condicional do escopo familiar para o Painel Aksurim.
    //    Exige DUAS condições simultâneas:
    //      a) a rota é explicitamente marcada com @GlobalAdminOnly();
    //      b) o usuário autenticado possui isGlobalAdmin === true.
    //    Role.ADMIN (chefe de família) NÃO habilita o bypass.
    if (this.shouldBypassFamilyScope(context, user)) {
      request[FAMILY_SCOPE_KEY] = { familyAccountId: '', bypass: true };
      return next.handle();
    }

    // 4. Injeta o escopo no request para consumo obrigatório pelos services.
    request[FAMILY_SCOPE_KEY] = {
      familyAccountId: user.familyAccountId,
      bypass: false,
    };

    return next.handle();
  }

  /**
   * Determina se o escopo familiar deve ser ignorado nesta requisição.
   *
   * O bypass só é concedido quando a rota é marcada com `@GlobalAdminOnly()`
   * E o usuário autenticado é um Admin Global (`isGlobalAdmin === true`).
   * Caso contrário, o isolamento multi-tenant permanece intacto (RN-01/§8.3).
   */
  private shouldBypassFamilyScope(
    context: ExecutionContext,
    user: AuthenticatedUser,
  ): boolean {
    const isGlobalAdminRoute = this.reflector.getAllAndOverride<boolean>(
      GLOBAL_ADMIN_KEY,
      [context.getHandler(), context.getClass()],
    );

    return isGlobalAdminRoute === true && user.isGlobalAdmin === true;
  }

  /**
   * Garante que `familyAccountId` não seja fornecido via query, body ou params.
   * O escopo é sempre derivado do token — nunca do cliente (RN-01 / §8.3).
   */
  private assertNoClientSuppliedScope(request: {
    query?: Record<string, unknown>;
    body?: Record<string, unknown>;
    params?: Record<string, unknown>;
  }): void {
    const sources: Array<Record<string, unknown> | undefined> = [
      request.query,
      request.body,
      request.params,
    ];

    for (const source of sources) {
      if (!source) {
        continue;
      }

      for (const field of FORBIDDEN_SCOPE_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(source, field)) {
          throw new BadRequestException(
            `O campo "${field}" não pode ser informado pelo cliente. ` +
              'O escopo familiar é derivado exclusivamente do token de autenticação.',
          );
        }
      }
    }
  }
}
