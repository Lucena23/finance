import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { of } from 'rxjs';

import { AuthenticatedUser } from '../auth/jwt.strategy';
import { GLOBAL_ADMIN_KEY } from './decorators/global-admin.decorator';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import {
  FAMILY_SCOPE_KEY,
  FamilyScope,
  FamilyScopeInterceptor,
} from './interceptors/family-scope.interceptor';

/**
 * Testes do Bypass Condicional do FamilyScopeInterceptor — TAREFA 24 / RN-15.
 *
 * Regra: o escopo familiar só é ignorado quando DUAS condições são atendidas
 * simultaneamente:
 *   a) a rota é marcada com @GlobalAdminOnly();
 *   b) o usuário autenticado possui isGlobalAdmin === true.
 *
 * Role.ADMIN (chefe de família) NUNCA habilita o bypass.
 */

const FAM_A = 'fam-A';

interface MockRequest {
  user?: AuthenticatedUser;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  params?: Record<string, unknown>;
  [FAMILY_SCOPE_KEY]?: FamilyScope;
}

/**
 * Cria um ExecutionContext falso com o request informado.
 */
function createContext(request: MockRequest): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

/**
 * Reflector falso que responde às chaves de metadata configuradas.
 */
function createReflector(metadata: {
  isPublic?: boolean;
  isGlobalAdminRoute?: boolean;
}): Reflector {
  return {
    getAllAndOverride: (key: string) => {
      if (key === IS_PUBLIC_KEY) {
        return metadata.isPublic ?? false;
      }
      if (key === GLOBAL_ADMIN_KEY) {
        return metadata.isGlobalAdminRoute ?? false;
      }
      return undefined;
    },
  } as unknown as Reflector;
}

const next: CallHandler = { handle: () => of('ok') };

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    userId: 'user-1',
    email: 'user@aksurim.com',
    role: Role.MEMBER,
    familyAccountId: FAM_A,
    isGlobalAdmin: false,
    ...overrides,
  };
}

describe('FamilyScopeInterceptor — Bypass Condicional (TAREFA 24 / RN-15)', () => {
  it('aplica o escopo familiar em rota comum (sem @GlobalAdminOnly)', () => {
    const request: MockRequest = { user: makeUser() };
    const interceptor = new FamilyScopeInterceptor(
      createReflector({ isGlobalAdminRoute: false }),
    );

    interceptor.intercept(createContext(request), next);

    expect(request[FAMILY_SCOPE_KEY]).toEqual({
      familyAccountId: FAM_A,
      bypass: false,
    });
  });

  it('NÃO faz bypass quando a rota é @GlobalAdminOnly mas o usuário NÃO é Admin Global', () => {
    const request: MockRequest = {
      user: makeUser({ isGlobalAdmin: false, role: Role.ADMIN }),
    };
    const interceptor = new FamilyScopeInterceptor(
      createReflector({ isGlobalAdminRoute: true }),
    );

    interceptor.intercept(createContext(request), next);

    // Mesmo sendo Role.ADMIN (chefe de família), o escopo é aplicado.
    expect(request[FAMILY_SCOPE_KEY]).toEqual({
      familyAccountId: FAM_A,
      bypass: false,
    });
  });

  it('NÃO faz bypass quando o usuário é Admin Global mas a rota NÃO é @GlobalAdminOnly', () => {
    const request: MockRequest = {
      user: makeUser({ isGlobalAdmin: true }),
    };
    const interceptor = new FamilyScopeInterceptor(
      createReflector({ isGlobalAdminRoute: false }),
    );

    interceptor.intercept(createContext(request), next);

    expect(request[FAMILY_SCOPE_KEY]).toEqual({
      familyAccountId: FAM_A,
      bypass: false,
    });
  });

  it('FAZ bypass quando a rota é @GlobalAdminOnly E o usuário é Admin Global', () => {
    const request: MockRequest = {
      user: makeUser({ isGlobalAdmin: true }),
    };
    const interceptor = new FamilyScopeInterceptor(
      createReflector({ isGlobalAdminRoute: true }),
    );

    interceptor.intercept(createContext(request), next);

    expect(request[FAMILY_SCOPE_KEY]).toEqual({
      familyAccountId: '',
      bypass: true,
    });
  });

  it('ignora rotas @Public() (sem escopo familiar)', () => {
    const request: MockRequest = { user: makeUser() };
    const interceptor = new FamilyScopeInterceptor(
      createReflector({ isPublic: true }),
    );

    interceptor.intercept(createContext(request), next);

    expect(request[FAMILY_SCOPE_KEY]).toBeUndefined();
  });

  it('bloqueia (400) familyAccountId fornecido pelo cliente mesmo em rota Admin Global', () => {
    const request: MockRequest = {
      user: makeUser({ isGlobalAdmin: true }),
      query: { familyAccountId: 'fam-injetado' },
    };
    const interceptor = new FamilyScopeInterceptor(
      createReflector({ isGlobalAdminRoute: true }),
    );

    expect(() =>
      interceptor.intercept(createContext(request), next),
    ).toThrow();
    expect(request[FAMILY_SCOPE_KEY]).toBeUndefined();
  });
});
