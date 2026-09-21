import { ConflictException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  private getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return 'US';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  async create(familyAccountId: string, dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email já em uso.');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const initials = this.getInitials(dto.name);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: dto.role,
        avatarColor: dto.avatarColor,
        initials,
        familyAccountId,
      },
    });

    const { passwordHash: _, ...safeUser } = user;
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

    await this.prisma.user.delete({ where: { id } });
  }
}
