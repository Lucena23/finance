import { ConflictException, Injectable, NotFoundException, BadRequestException, Optional } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { getLogoCidAttachment, getWelcomeEmailHtml } from '../auth/email-templates';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly mailerService?: MailerService,
  ) {}

  private getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return 'US';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  async create(familyAccountId: string, dto: CreateUserDto) {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email já em uso.');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const initials = this.getInitials(dto.name);
    const verifyToken = crypto.randomBytes(32).toString('hex');

    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email,
        passwordHash,
        role: dto.role,
        avatarColor: dto.avatarColor,
        initials,
        familyAccountId,
        verifyToken,
      },
    });

    if (this.mailerService) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
      const verifyLink = `${backendUrl}/api/v1/auth/verify?token=${verifyToken}`;
      const emailHtml = getWelcomeEmailHtml(dto.name.trim(), verifyLink, frontendUrl);

      await this.mailerService
        .sendMail({
          to: email,
          subject: 'Bem-vindo ao Aksurim Controle! Confirme seu e-mail.',
          html: emailHtml,
          attachments: [getLogoCidAttachment()],
        })
        .catch((err) => console.error('Erro ao enviar e-mail de convite de membro:', err));
    }

    const { passwordHash: _, verifyToken: __, ...safeUser } = user;
    return safeUser;
  }

  async findAll(familyAccountId: string) {
    return this.prisma.user.findMany({
      where: { familyAccountId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarColor: true,
        initials: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async update(familyAccountId: string, id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findFirst({ where: { id, familyAccountId } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    const data: any = { ...dto };
    if (dto.name) data.initials = this.getInitials(dto.name);

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarColor: true,
        initials: true,
      },
    });

    return updated;
  }

  async remove(familyAccountId: string, id: string) {
    const user = await this.prisma.user.findFirst({ where: { id, familyAccountId } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    if (user.role === Role.ADMIN) {
      const admins = await this.prisma.user.count({ where: { familyAccountId, role: Role.ADMIN } });
      if (admins <= 1) throw new BadRequestException('Não é possível remover o único ADMIN.');
    }

    const fallbackAdmin = await this.prisma.user.findFirst({
      where: {
        familyAccountId,
        role: Role.ADMIN,
        id: { not: id },
      },
      select: { id: true },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.pushSubscription.deleteMany({ where: { userId: id } });
      await tx.paymentItem.updateMany({
        where: { paidById: id },
        data: { paidById: null },
      });

      if (fallbackAdmin) {
        await tx.expense.updateMany({
          where: { familyAccountId, createdById: id },
          data: { createdById: fallbackAdmin.id },
        });
      }

      await tx.user.delete({ where: { id } });
    });
  }
}
