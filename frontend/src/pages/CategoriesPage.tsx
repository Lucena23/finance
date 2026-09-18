/**
 * CategoriesPage.tsx — Gestão de categorias (TAREFA 43).
 *
 * Tela de CRUD de categorias com cor e ícone personalizáveis. Integra:
 *  - <CategoryForm />: criação/edição com seletores de cor e ícone Lucide.
 *  - <CategoryCard />: listagem com ações editar/excluir.
 *
 * Consome GET /categories (via useCategories) e as mutações POST/PATCH/DELETE
 * (via useCategoryMutations). As ações de gestão são restritas a ADMIN
 * (RN-03); MEMBER apenas visualiza. O bloqueio de exclusão de categorias com
 * despesas vinculadas (409) é exibido com mensagem clara ao usuário.
 *
 * REGRA (§8.1): proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import { AlertCircle, Plus, RefreshCw, X } from 'lucide-react';
import { useCallback, useState } from 'react';

import { CategoryCard } from '@/components/category/CategoryCard';
import { CategoryForm } from '@/components/category/CategoryForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { useCategoryMutations } from '@/hooks/useCategoryMutations';
import { ApiError, type Category } from '@/lib/api';
import { Role } from '@/lib/constants';

/**
 * Página de Categorias (rota "/categories").
 */
export function CategoriesPage(): JSX.Element {
  const { user } = useAuth();
  const { categories, isLoading, error, refetch } = useCategories();
  const { create, update, remove, isSubmitting } =
    useCategoryMutations(refetch);

  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const canManage = user?.role === Role.ADMIN;

  const handleOpenCreate = useCallback((): void => {
    setEditingCategory(null);
    setIsFormOpen(true);
    setActionError(null);
  }, []);

  const handleOpenEdit = useCallback((category: Category): void => {
    setEditingCategory(category);
    setIsFormOpen(true);
    setActionError(null);
  }, []);

  const handleCloseForm = useCallback((): void => {
    setIsFormOpen(false);
    setEditingCategory(null);
  }, []);

  const handleSubmit = useCallback(
    async (values: {
      name: string;
      color: string;
      icon: string;
    }): Promise<void> => {
      if (editingCategory) {
        await update(editingCategory.id, values);
      } else {
        await create(values);
      }
      handleCloseForm();
    },
    [editingCategory, update, create, handleCloseForm],
  );

  const handleDelete = useCallback(
    async (category: Category): Promise<void> => {
      setActionError(null);
      try {
        await remove(category.id);
      } catch (err) {
        // 409 → categoria possui despesas vinculadas (RN-03 / TAREFA 17).
        if (err instanceof ApiError && err.status === 409) {
          setActionError(
            `A categoria "${category.name}" possui despesas vinculadas e não pode ser excluída.`,
          );
          return;
        }

        const message =
          err instanceof ApiError
            ? err.message
            : 'Não foi possível excluir a categoria.';
        setActionError(message);
      }
    },
    [remove],
  );

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold tracking-tight">Categorias</h1>
          <p className="text-muted-foreground text-sm">
            Organize suas despesas com categorias coloridas e ícones
            personalizados.
          </p>
        </div>

        {canManage && !isFormOpen ? (
          <Button
            type="button"
            size="sm"
            onClick={handleOpenCreate}
            data-testid="categories-new-button"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Nova
          </Button>
        ) : null}
      </header>

      {/* Formulário de criação/edição (ADMIN) */}
      {canManage && isFormOpen ? (
        <Card data-testid="categories-form-container">
          <CardContent className="flex flex-col gap-4 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">
                {editingCategory ? 'Editar categoria' : 'Nova categoria'}
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Fechar formulário"
                onClick={handleCloseForm}
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </Button>
            </div>

            <CategoryForm
              category={editingCategory}
              onSubmit={handleSubmit}
              onCancel={handleCloseForm}
            />
          </CardContent>
        </Card>
      ) : null}

      {actionError ? (
        <p
          role="alert"
          className="text-destructive text-sm font-medium"
          data-testid="categories-action-error"
        >
          {actionError}
        </p>
      ) : null}

      {/* Estado de carregamento */}
      {isLoading ? (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col gap-3"
          data-testid="categories-loading"
        >
          <span className="sr-only">Carregando categorias…</span>
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="bg-muted h-16 w-full animate-pulse rounded-lg"
            />
          ))}
        </div>
      ) : null}

      {/* Estado de erro */}
      {!isLoading && error ? (
        <Card
          role="alert"
          className="border-destructive/40"
          data-testid="categories-error"
        >
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <AlertCircle
              aria-hidden="true"
              className="text-destructive h-8 w-8"
            />
            <p className="text-sm font-medium">{error}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
            >
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Estado vazio */}
      {!isLoading && !error && categories.length === 0 ? (
        <Card data-testid="categories-empty">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <p className="text-base font-semibold">
              Nenhuma categoria cadastrada
            </p>
            <p className="text-muted-foreground text-sm">
              Crie categorias para classificar suas despesas e gerar relatórios
              por área de gasto.
            </p>
            {canManage ? (
              <Button type="button" size="sm" onClick={handleOpenCreate}>
                <Plus aria-hidden="true" className="h-4 w-4" />
                Nova categoria
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Listagem de categorias */}
      {!isLoading && !error && categories.length > 0 ? (
        <ul className="flex flex-col gap-3" data-testid="categories-list">
          {categories.map((category) => (
            <li key={category.id}>
              <CategoryCard
                category={category}
                canManage={canManage && !isSubmitting}
                onEdit={handleOpenEdit}
                onDelete={(item) => void handleDelete(item)}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
