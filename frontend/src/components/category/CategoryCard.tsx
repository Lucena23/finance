/**
 * CategoryCard.tsx — Card de uma categoria na listagem (TAREFA 43).
 *
 * Apresenta o ícone Lucide, o nome e a cor da categoria. Expõe ações de
 * editar e excluir, restritas a ADMIN (RN-03). O ícone é resolvido a partir
 * do nome persistido no campo `icon` da Category.
 *
 * REGRA (§8.1): proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import { Pencil, Trash2 } from 'lucide-react';

import { resolveCategoryIcon } from '@/components/category/IconPicker';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Category } from '@/lib/api';

interface CategoryCardProps {
  /** Categoria a ser exibida. */
  category: Category;
  /** Indica se o usuário pode editar/excluir (ADMIN — RN-03). */
  canManage?: boolean;
  /** Callback de edição. */
  onEdit?: (category: Category) => void;
  /** Callback de exclusão. */
  onDelete?: (category: Category) => void;
}

/**
 * Card de uma categoria com ações de gestão.
 */
export function CategoryCard({
  category,
  canManage = false,
  onEdit,
  onDelete,
}: CategoryCardProps): JSX.Element {
  const Icon = resolveCategoryIcon(category.icon);

  return (
    <Card
      data-testid="category-card"
      data-category-id={category.id}
    >
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: category.color }}
          >
            <Icon className="h-5 w-5 text-white" />
          </span>
          <span className="truncate text-sm font-semibold">
            {category.name}
          </span>
        </div>

        {canManage ? (
          <div className="flex shrink-0 items-center gap-2">
            {onEdit ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={`Editar ${category.name}`}
                onClick={() => onEdit(category)}
                data-testid="category-card-edit"
              >
                <Pencil aria-hidden="true" className="h-4 w-4" />
              </Button>
            ) : null}

            {onDelete ? (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                aria-label={`Excluir ${category.name}`}
                onClick={() => onDelete(category)}
                data-testid="category-card-delete"
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
