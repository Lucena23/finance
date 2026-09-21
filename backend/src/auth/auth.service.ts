import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { MailerService } from '@nestjs-modules/mailer';

import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const BCRYPT_SALT_ROUNDS = 10;

/**
 * Cores seguras para o avatar do usuário.
 */
const AVATAR_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#f43f5e',
];

/**
 * Payload do JWT — ARCHITECTURE §5.1.
 */
export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
  familyAccountId: string;
}

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

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function pickAvatarColor(excludeColors: string[]): string {
  const available = AVATAR_COLORS.filter((c) => !excludeColors.includes(c));
  const pool = available.length > 0 ? available : AVATAR_COLORS;
  return pool[Math.floor(Math.random() * pool.length)];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
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

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      // Sempre retornar sucesso para não vazar emails existentes
      return { message: 'Se o e-mail existir, um link de recuperação foi enviado.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 1000 * 60 * 60); // 1 hora

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpires },
    });

    const resetUrl = `https://financas.aksurim.com/reset-password?token=${resetToken}`;

    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Recuperação de Senha - Finanças Aksurim',
      html: `
        <h3>Olá, ${user.name}</h3>
        <p>Você solicitou a recuperação de senha da sua conta.</p>
        <p>Clique no link abaixo para criar uma nova senha:</p>
        <p><a href="${resetUrl}">Redefinir minha senha</a></p>
        <p>Este link é válido por 1 hora.</p>
      `,
    });

    return { message: 'Se o e-mail existir, um link de recuperação foi enviado.' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: dto.token,
        resetTokenExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Token inválido ou expirado.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_SALT_ROUNDS);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    return { message: 'Senha atualizada com sucesso.' };
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
