/**
 * ExpensesPage.tsx — Gestão de despesas (TAREFA 42).
 *
 * Tela de cadastro e gestão de despesas dos três tipos (SINGLE, INSTALLMENT,
 * RECURRENT). Integra:
 *  - <ExpenseForm />: criação/edição com campos condicionais por tipo.
 *  - <ExpenseCard />: listagem com ações editar/excluir/restaurar e encerrar
 *    recorrência.
 *
 * Consome GET /expenses (via useExpenses) e GET /categories (via
 * useCategories) para resolver nome e cor das categorias vinculadas.
 *
 * REGRA (§8.1): proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import { AlertCircle, Plus, RefreshCw, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { ExpenseCard } from '@/components/expense/ExpenseCard';
import { ExpenseForm } from '@/components/expense/ExpenseForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCategories } from '@/hooks/useCategories';
import { useExpenses } from '@/hooks/useExpenses';
import { ApiError, type Category, type Expense } from '@/lib/api';

/**
 * Página de Despesas (rota "/expenses").
 */
export function ExpensesPage(): JSX.Element {
  const {
    expenses,
    isLoading,
    error,
    refetch,
    remove,
    restore,
    cancelRecurrence,
  } = useExpenses();
  const { categories } = useCategories();

  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Mapa de categorias por id para resolução O(1) no render.
  const categoryById = useMemo<Map<string, Category>>(() => {
    const map = new Map<string, Category>();
    for (const category of categories) {
      map.set(category.id, category);
    }
    return map;
  }, [categories]);

  const handleOpenCreate = useCallback((): void => {
    setEditingExpense(null);
    setIsFormOpen(true);
    setActionError(null);
  }, []);

  const handleOpenEdit = useCallback((expense: Expense): void => {
    setEditingExpense(expense);
    setIsFormOpen(true);
    setActionError(null);
  }, []);

  const handleCloseForm = useCallback((): void => {
    setIsFormOpen(false);
    setEditingExpense(null);
  }, []);

  const handleFormSuccess = useCallback((): void => {
    handleCloseForm();
    void refetch();
  }, [handleCloseForm, refetch]);

  const handleDelete = useCallback(
    async (expense: Expense): Promise<void> => {
      setActionError(null);
      try {
        await remove(expense.id);
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : 'Não foi possível excluir a despesa.';
        setActionError(message);
      }
    },
    [remove],
  );

  const handleRestore = useCallback(
    async (expense: Expense): Promise<void> => {
      setActionError(null);
      try {
        await restore(expense.id);
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : 'Não foi possível restaurar a despesa.';
        setActionError(message);
      }
    },
    [restore],
  );

  const handleCancelRecurrence = useCallback(
    async (expense: Expense): Promise<void> => {
      setActionError(null);
      try {
        await cancelRecurrence(expense.id);
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : 'Não foi possível encerrar a recorrência.';
        setActionError(message);
      }
    },
    [cancelRecurrence],
  );

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold tracking-tight">Despesas</h1>
          <p className="text-muted-foreground text-sm">
            Cadastre despesas avulsas, parceladas e recorrentes.
          </p>
        </div>

        {!isFormOpen ? (
          <Button
            type="button"
            size="sm"
            onClick={handleOpenCreate}
            data-testid="expenses-new-button"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Nova
          </Button>
        ) : null}
      </header>

      {/* Formulário de criação/edição */}
      {isFormOpen ? (
        <Card data-testid="expenses-form-container">
          <CardContent className="flex flex-col gap-4 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">
                {editingExpense ? 'Editar despesa' : 'Nova despesa'}
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

            <ExpenseForm
              categories={categories}
              expense={editingExpense}
              onSuccess={handleFormSuccess}
              onCancel={handleCloseForm}
            />
          </CardContent>
        </Card>
      ) : null}

      {actionError ? (
        <p
          role="alert"
          className="text-destructive text-sm font-medium"
          data-testid="expenses-action-error"
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
          data-testid="expenses-loading"
        >
          <span className="sr-only">Carregando despesas…</span>
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="bg-muted h-24 w-full animate-pulse rounded-lg"
            />
          ))}
        </div>
      ) : null}

      {/* Estado de erro */}
      {!isLoading && error ? (
        <Card
          role="alert"
          className="border-destructive/40"
          data-testid="expenses-error"
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
      {!isLoading && !error && expenses.length === 0 ? (
        <Card data-testid="expenses-empty">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <p className="text-base font-semibold">Nenhuma despesa cadastrada</p>
            <p className="text-muted-foreground text-sm">
              Comece criando sua primeira despesa avulsa, parcelada ou
              recorrente.
            </p>
            <Button type="button" size="sm" onClick={handleOpenCreate}>
              <Plus aria-hidden="true" className="h-4 w-4" />
              Nova despesa
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Listagem de despesas */}
      {!isLoading && !error && expenses.length > 0 ? (
        <ul
          className="flex flex-col gap-3"
          data-testid="expenses-list"
        >
          {expenses.map((expense) => (
            <li key={expense.id}>
              <ExpenseCard
                expense={expense}
                category={categoryById.get(expense.categoryId)}
                isDeleted={expense.deletedAt !== null}
                onEdit={handleOpenEdit}
                onDelete={(item) => void handleDelete(item)}
                onRestore={(item) => void handleRestore(item)}
                onCancelRecurrence={(item) =>
                  void handleCancelRecurrence(item)
                }
              />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
