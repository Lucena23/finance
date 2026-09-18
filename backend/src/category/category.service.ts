import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Category } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

/**
 * CategoryService — CRUD de categorias de gastos com cor e ícone.
 * ARCHITECTURE §3.2 — MÓDULO CATEGORIES — TAREFA 17.
 *
 * Isolamento multi-tenant (RN-01 / §8.3): TODAS as queries filtram por
 * `familyAccountId`, derivado exclusivamente do JWT pelo FamilyScopeInterceptor.
 * Nenhum método aceita familyAccountId de query/body.
 */
@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista todas as categorias do workspace familiar autenticado.
   * Escopo obrigatório por familyAccountId (RN-01 / §8.3).
   */
  async findAll(familyAccountId: string): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { familyAccountId },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Cria uma categoria no workspace familiar autenticado.
   * O familyAccountId é derivado exclusivamente do JWT (RN-01 / §8.3).
   */
  async create(
    familyAccountId: string,
    dto: CreateCategoryDto,
  ): Promise<Category> {
    return this.prisma.category.create({
      data: {
        name: dto.name.trim(),
        color: dto.color,
        icon: dto.icon.trim(),
        familyAccountId,
      },
    });
  }

  /**
   * Atualiza parcialmente uma categoria do workspace autenticado.
   * Retorna 404 se a categoria não pertencer ao workspace (RN-01 / §8.3).
   */
  async update(
    familyAccountId: string,
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<Category> {
    await this.findOneOrFail(familyAccountId, id);

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.color !== undefined ? { color: dto.color } : {}),
        ...(dto.icon !== undefined ? { icon: dto.icon.trim() } : {}),
      },
    });
  }

  /**
   * Remove uma categoria do workspace autenticado.
   * Bloqueia (409) se houver despesas vinculadas — inclusive soft-deleted,
   * pois a FK permanece válida e a restauração deve ser possível (RN-11).
   * Retorna 404 se a categoria não pertencer ao workspace (RN-01 / §8.3).
   */
  async remove(familyAccountId: string, id: string): Promise<void> {
    await this.findOneOrFail(familyAccountId, id);

    const linkedExpenses = await this.prisma.expense.count({
      where: { categoryId: id, familyAccountId },
    });

    if (linkedExpenses > 0) {
      throw new ConflictException(
        'Não é possível excluir uma categoria com despesas vinculadas.',
      );
    }

    await this.prisma.category.delete({ where: { id } });
  }

  /**
   * Busca uma categoria garantindo o escopo familiar.
   * Retorna 404 quando inexistente OU pertencente a outro workspace,
   * evitando vazamento de dados entre tenants (RN-01 / §8.3).
   */
  private async findOneOrFail(
    familyAccountId: string,
    id: string,
  ): Promise<Category> {
    const category = await this.prisma.category.findFirst({
      where: { id, familyAccountId },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada.');
    }

    return category;
  }
}
