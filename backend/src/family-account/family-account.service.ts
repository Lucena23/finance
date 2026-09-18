import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FamilyAccount } from '@prisma/client';

import { formatCpf, maskCpfForDisplay } from '../common/utils/cpf.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFamilyAccountDto } from './dto/create-family-account.dto';
import { UpdateFamilyAccountDto } from './dto/update-family-account.dto';

/**
 * Representação pública de um workspace familiar.
 * O CPF é exposto apenas de forma parcial (***.***.XXX-XX) — ARCHITECTURE §5.5.
 */
export interface FamilyAccountView {
  id: string;
  name: string;
  ownerCpfMasked: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * FamilyAccountService — gestão do workspace familiar (RN-01 / RN-02).
 * ARCHITECTURE §3.2 — MÓDULO FAMILY-ACCOUNT — TAREFA 15.
 */
@Injectable()
export class FamilyAccountService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria um novo workspace familiar.
   * RN-02: exige CPF válido e único; armazenado mascarado (XXX.XXX.XXX-XX).
   * CPF duplicado retorna 409.
   */
  async create(dto: CreateFamilyAccountDto): Promise<FamilyAccountView> {
    const ownerCpf = formatCpf(dto.ownerCpf);

    const existing = await this.prisma.familyAccount.findUnique({
      where: { ownerCpf },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('CPF já cadastrado.');
    }

    const family = await this.prisma.familyAccount.create({
      data: {
        name: dto.name.trim(),
        ownerCpf,
      },
    });

    return this.toView(family);
  }

  /**
   * Retorna o workspace do escopo familiar autenticado.
   * O familyAccountId é derivado exclusivamente do JWT (RN-01 / §8.3).
   */
  async findCurrent(familyAccountId: string): Promise<FamilyAccountView> {
    const family = await this.prisma.familyAccount.findUnique({
      where: { id: familyAccountId },
    });

    if (!family) {
      throw new NotFoundException('Workspace familiar não encontrado.');
    }

    return this.toView(family);
  }

  /**
   * Atualiza o nome do workspace do escopo familiar autenticado.
   * O ownerCpf é imutável (chave de identificação fiscal — RN-02).
   */
  async update(
    familyAccountId: string,
    dto: UpdateFamilyAccountDto,
  ): Promise<FamilyAccountView> {
    await this.findCurrent(familyAccountId);

    const family = await this.prisma.familyAccount.update({
      where: { id: familyAccountId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      },
    });

    return this.toView(family);
  }

  /**
   * Converte a entidade para a view pública, mascarando o CPF.
   */
  private toView(family: FamilyAccount): FamilyAccountView {
    return {
      id: family.id,
      name: family.name,
      ownerCpfMasked: maskCpfForDisplay(family.ownerCpf),
      createdAt: family.createdAt,
      updatedAt: family.updatedAt,
    };
  }
}
