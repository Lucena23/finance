import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Category } from '@prisma/client';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FamilyScopeParam } from '../common/decorators/family-scope.decorator';
import { FamilyScope } from '../common/interceptors/family-scope.interceptor';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

/**
 * CategoryController — CRUD de categorias de gastos.
 * ARCHITECTURE §3.2 — MÓDULO CATEGORIES — TAREFA 17.
 *
 * O familyAccountId é SEMPRE derivado do JWT via FamilyScopeInterceptor
 * (RN-01 / §8.3) — nunca aceito como parâmetro de query/body.
 * Membros secundários podem gerenciar categorias no Premium/Trial e ficam em
 * modo somente leitura no Free (via assertMemberCanWrite).
 */
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  /**
   * Lista as categorias do workspace familiar autenticado.
   * Acessível a ADMIN e MEMBER (RN-03).
   */
  @Get()
  findAll(@FamilyScopeParam() scope: FamilyScope): Promise<Category[]> {
    return this.categoryService.findAll(scope.familyAccountId);
  }

  /**
   * Cria uma categoria.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @FamilyScopeParam() scope: FamilyScope,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCategoryDto,
  ): Promise<Category> {
    return this.categoryService.create(scope.familyAccountId, dto, user.role);
  }

  /**
   * Atualiza parcialmente uma categoria.
   */
  @Patch(':id')
  update(
    @FamilyScopeParam() scope: FamilyScope,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<Category> {
    return this.categoryService.update(
      scope.familyAccountId,
      id,
      dto,
      user.role,
    );
  }

  /**
   * Remove uma categoria.
   * Bloqueia (409) se houver despesas vinculadas.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @FamilyScopeParam() scope: FamilyScope,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.categoryService.remove(scope.familyAccountId, id, user.role);
  }
}
