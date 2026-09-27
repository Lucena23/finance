import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { PrismaService } from '../prisma/prisma.service';

/**
 * Payload decodificado do JWT — ARCHITECTURE §5.1.
 * Contém: userId, email, role, familyAccountId.
 */
export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
  familyAccountId: string;
}

/**
 * Usuário autenticado anexado ao request (request.user).
 * Derivado exclusivamente do JWT validado — nunca de query/body.
 *
 * `isGlobalAdmin` (RN-15) é revalidado no banco a cada requisição para
 * permitir o bypass condicional do FamilyScopeInterceptor no Painel Aksurim.
 */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: Role;
  familyAccountId: string;
  isGlobalAdmin: boolean;
}

/**
 * JwtStrategy — Passport JWT Strategy.
 * Valida o Bearer token e resolve o usuário autenticado.
 * ARCHITECTURE §5.1 / §5.2 — TAREFA 11.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? '',
    });
  }

  /**
   * Revalida o usuário no banco a cada requisição para garantir que o
   * vínculo familiar, o papel e a flag de Admin Global permaneçam
   * consistentes (RN-01 / RN-03 / RN-15).
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        familyAccountId: true,
        isGlobalAdmin: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Token inválido.');
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      familyAccountId: user.familyAccountId,
      isGlobalAdmin: user.isGlobalAdmin,
    };
  }
}
