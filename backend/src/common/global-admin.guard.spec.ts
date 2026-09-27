import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

import { AuthenticatedUser } from '../auth/jwt.strategy';
import { GLOBAL_ADMIN_KEY } from './decorators/global-admin.decorator';
import { GlobalAdminGuard } from './guards/global-admin.guard';

/**
 * Testes do GlobalAdminGuard — TAREFA 25 / RN-15.
 *
 * Regra: rotas marcadas com @GlobalAdminOnly() exigem `isGlobalAdmin === true`.
 * Role.ADMIN (chefe de família) NUNCA concede acesso ao Painel Aksurim.
 */

function createContext(user?: AuthenticatedUser): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

function createReflector(isGlobalAdminRoute: boolean): Reflector {
  return {
    getAllAndOverride: (key: string) =>
      key === GLOBAL_ADMIN_KEY ? isGlobalAdminRoute : undefined,
  } as unknown as Reflector;
}

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    userId: 'user-1',
    email: 'user@aksurim.com',
    role: Role.MEMBER,
    familyAccountId: 'fam-A',
    isGlobalAdmin: false,
    ...overrides,
  };
}

describe('GlobalAdminGuard (TAREFA 25 / RN-15)', () => {
  it('libera rotas sem @GlobalAdminOnly()', () => {
    const guard = new GlobalAdminGuard(createReflector(false));
    expect(guard.canActivate(createContext(makeUser()))).toBe(true);
  });

  it('permite acesso quando o usuário é Admin Global', () => {
    const guard = new GlobalAdminGuard(createReflector(true));
    expect(
      guard.canActivate(createContext(makeUser({ isGlobalAdmin: true }))),
    ).toBe(true);
  });

  it('bloqueia (403) Role.ADMIN sem isGlobalAdmin', () => {
    const guard = new GlobalAdminGuard(createReflector(true));
    expect(() =>
      guard.canActivate(createContext(makeUser({ role: Role.ADMIN }))),
    ).toThrow(ForbiddenException);
  });

  it('bloqueia (403) usuário MEMBER comum', () => {
    const guard = new GlobalAdminGuard(createReflector(true));
    expect(() => guard.canActivate(createContext(makeUser()))).toThrow(
      ForbiddenException,
    );
  });

  it('bloqueia (403) quando não há usuário autenticado', () => {
    const guard = new GlobalAdminGuard(createReflector(true));
    expect(() => guard.canActivate(createContext(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
