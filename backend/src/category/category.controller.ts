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
import { Category, Role } from '@prisma/client';

import { FamilyScopeParam } from '../common/decorators/family-scope.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { FamilyScope } from '../common/interceptors/family-scope.interceptor';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

/**
 * CategoryController — CRUD de categorias de gastos.
 * ARCHITECTURE §3.2 — MÓDULO CATEGORIES — TAREFA 17.
 *
 * O familyAccountId é SEMPRE derivado do JWT via FamilyScopeInterceptor
 * (RN-01 / §8.3) — nunca aceito como parâmetro de query/body.
 * Escrita (POST/PATCH/DELETE) restrita a ADMIN (RN-03).
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
   * Cria uma categoria. Requer ADMIN (RN-03).
   */
  @Roles(Role.ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @FamilyScopeParam() scope: FamilyScope,
    @Body() dto: CreateCategoryDto,
  ): Promise<Category> {
    return this.categoryService.create(scope.familyAccountId, dto);
  }

  /**
   * Atualiza parcialmente uma categoria. Requer ADMIN (RN-03).
   */
  @Roles(Role.ADMIN)
  @Patch(':id')
  update(
    @FamilyScopeParam() scope: FamilyScope,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<Category> {
    return this.categoryService.update(scope.familyAccountId, id, dto);
  }

  /**
   * Remove uma categoria. Requer ADMIN (RN-03).
   * Bloqueia (409) se houver despesas vinculadas.
   */
  @Roles(Role.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @FamilyScopeParam() scope: FamilyScope,
    @Param('id') id: string,
  ): Promise<void> {
    return this.categoryService.remove(scope.familyAccountId, id);
  }
}
