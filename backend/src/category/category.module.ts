import { Module } from '@nestjs/common';

import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';

/**
 * CategoryModule — CRUD de categorias de gastos com cor e ícone.
 * ARCHITECTURE §2 — TAREFA 17.
 */
@Module({
  controllers: [CategoryController],
  providers: [CategoryService],
  exports: [CategoryService],
})
export class CategoryModule {}
