import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '../prisma/prisma.service';
import { pickAvatarColor } from '../common/utils/avatar-color.util';
import { getInitials } from '../common/utils/initials.util';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const BCRYPT_SALT_ROUNDS = 12;

/**
 * Payload do JWT — ARCHITECTURE §5.1.
 */
export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
  familyAccountId: string;
}

/**
 * Usuário seguro (sem passwordHash) retornado nas responses.
 */
export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  initials: string;
  avatarColor: string;
  familyAccountId: string;
}

export interface AuthResponse {
  accessToken: string;
  user: SafeUser;
}

/**
 * AuthService — lógica de autenticação (bcrypt + JWT).
 * ARCHITECTURE §3.2 / §5.1 — TAREFA 10.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Cria uma nova FamilyAccount + primeiro usuário (ADMIN).
   * RN-02: exige CPF do titular, único.
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const email = dto.email.toLowerCase().trim();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('E-mail já cadastrado.');
    }

    const existingFamily = await this.prisma.familyAccount.findUnique({
      where: { ownerCpf: dto.ownerCpf },
      select: { id: true },
    });

    if (existingFamily) {
      throw new ConflictException('CPF já cadastrado.');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    const initials = getInitials(dto.name);
    const avatarColor = pickAvatarColor([]);

    const result = await this.prisma.$transaction(async (tx) => {
      const family = await tx.familyAccount.create({
        data: {
          name: dto.familyName.trim(),
          ownerCpf: dto.ownerCpf,
        },
      });

      const user = await tx.user.create({
        data: {
          name: dto.name.trim(),
          email,
          whatsapp: dto.whatsapp,
          passwordHash,
          role: Role.ADMIN,
          initials,
          avatarColor,
          familyAccountId: family.id,
        },
      });

      return user;
    });

    return this.buildAuthResponse(result);
  }

  /**
   * Autentica um usuário existente.
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    const email = dto.email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    return this.buildAuthResponse(user);
  }

  private buildAuthResponse(user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    initials: string;
    avatarColor: string;
    familyAccountId: string;
  }): AuthResponse {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      familyAccountId: user.familyAccountId,
    };

    const accessToken = this.jwtService.sign(payload);

    const safeUser: SafeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      initials: user.initials,
      avatarColor: user.avatarColor,
      familyAccountId: user.familyAccountId,
    };

    return { accessToken, user: safeUser };
  }
}
