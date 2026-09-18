import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';

import { AuthenticatedUser } from '../../auth/jwt.strategy';

/**
 * Chave sob a qual o escopo familiar é anexado ao request.
 * Consumida pelos services via `@FamilyScope()` ou `request.familyScope`.
 */
export const FAMILY_SCOPE_KEY = 'familyScope';

/**
 * Escopo familiar derivado exclusivamente do JWT autenticado.
 * NUNCA deve ser aceito como parâmetro de query ou body (RN-01 / §8.3).
 */
export interface FamilyScope {
  familyAccountId: string;
}

/**
 * Campos proibidos em query/body — o escopo é sempre derivado do token.
 * Qualquer tentativa de injetá-los é tratada como vulnerabilidade crítica.
 */
const FORBIDDEN_SCOPE_FIELDS = ['familyAccountId', 'familyAccountID', 'family_account_id'];

/**
 * FamilyScopeInterceptor — Isolamento Multi-Tenant (RN-01 / §8.3).
 * ARCHITECTURE §5.2 — TAREFA 13.
 *
 * Responsabilidades:
 *  1. Extrair `familyAccountId` EXCLUSIVAMENTE do JWT (request.user).
 *  2. Injetar o escopo em `request.familyScope` para uso obrigatório nas queries.
 *  3. Rejeitar (400) qualquer requisição que tente fornecer `familyAccountId`
 *     via query string ou body — o escopo nunca é parametrizável pelo cliente.
 *
 * Deve ser aplicado APÓS o JwtAuthGuard, garantindo que request.user exista.
 */
@Injectable()
export class FamilyScopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
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

    if (!user || !user.familyAccountId) {
      // Sem usuário autenticado não há escopo — o JwtAuthGuard já deve ter
      // barrado rotas protegidas; aqui garantimos a invariante de segurança.
      throw new BadRequestException(
        'Escopo familiar indisponível: usuário não autenticado.',
      );
    }

    // 3. Injeta o escopo no request para consumo obrigatório pelos services.
    request[FAMILY_SCOPE_KEY] = { familyAccountId: user.familyAccountId };

    return next.handle();
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
