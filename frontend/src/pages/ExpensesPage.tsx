/**
 * ExpensesPage.tsx — Gestão de despesas (TAREFA 42 / TAREFA 15).
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
 * TAREFA 15: as ações de mutação (excluir/restaurar/encerrar recorrência)
 * agora exibem spinners individuais por card (via `pendingIds` do hook) e
 * aplicam atualização otimista — o feedback é instantâneo e a UI não trava
 * durante a comunicação com a API.
 *
 * REGRA (§8.1): proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import {
  AlertCircle,
  CalendarClock,
  ChevronDown,
  Crown,
  Layers,
  Lock,
  Plus,
  RefreshCw,
  Repeat,
  Search,
  X,
} from 'lucide-react';
import { useCallback, useContext, useMemo, useState } from 'react';

import { ExpenseCard } from '@/components/expense/ExpenseCard';
import { ExpenseForm } from '@/components/expense/ExpenseForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { AuthContext } from '@/contexts/AuthContext';
import { usePlan } from '@/contexts/PlanContext';
import { useCategories } from '@/hooks/useCategories';
import { useExpenses } from '@/hooks/useExpenses';
import { ApiError, type Category, type Expense } from '@/lib/api';
import { cn } from '@/lib/cn';
import { ExpenseType, Role } from '@/lib/constants';

const EXPENSE_TYPE_GROUPS: readonly {
  type: ExpenseType;
  label: string;
  subtitle: string;
  icon: typeof Repeat;
  headerClass: string;
  badgeClass: string;
}[] = [
  {
    type: ExpenseType.RECURRENT,
    label: 'Recorrentes',
    subtitle: 'Contas fixas mensais',
    icon: Repeat,
    headerClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    badgeClass: 'bg-emerald-500/20 text-emerald-300',
  },
  {
    type: ExpenseType.INSTALLMENT,
    label: 'Parceladas',
    subtitle: 'Compras divididas em parcelas',
    icon: Layers,
    headerClass: 'border-purple-500/30 bg-purple-500/10 text-purple-300',
    badgeClass: 'bg-purple-500/20 text-purple-300',
  },
  {
    type: ExpenseType.SINGLE,
    label: 'Avulsas',
    subtitle: 'Gastos únicos do mês',
    icon: CalendarClock,
    headerClass: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
    badgeClass: 'bg-blue-500/20 text-blue-300',
  },
] as const;

/**
 * Página de Despesas (rota "/expenses").
 */
export function ExpensesPage(): JSX.Element {
  const auth = useContext(AuthContext);
  const user = auth?.user ?? null;
  const { hasPremiumAccess, openPremiumModal } = usePlan();
  const {
    expenses,
    isLoading,
    error,
    refetch,
    remove,
    restore,
    cancelRecurrence,
    pendingIds,
  } = useExpenses();
  const { categories, refetch: refetchCategories } = useCategories();

  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = useCallback((type: string): void => {
    setCollapsedGroups((prev) => ({ ...prev, [type]: !prev[type] }));
  }, []);

  const filteredExpenses = useMemo<Expense[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return expenses;
    return expenses.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)),
    );
  }, [expenses, searchQuery]);

  const isReadOnlyMember = !hasPremiumAccess && user?.role === Role.MEMBER;

  // Mapa de categorias por id para resolução O(1) no render.
  const categoryById = useMemo<Map<string, Category>>(() => {
    const map = new Map<string, Category>();
    for (const category of categories) {
      map.set(category.id, category);
    }
    return map;
  }, [categories]);

  const handleOpenCreate = useCallback((): void => {
    if (isReadOnlyMember) {
      openPremiumModal('FAMILY_PLAN_EXPIRED');
      return;
    }
    setEditingExpense(null);
    setIsFormOpen(true);
    setActionError(null);
  }, [isReadOnlyMember, openPremiumModal]);

  const handleOpenEdit = useCallback(
    (expense: Expense): void => {
      if (isReadOnlyMember) {
        openPremiumModal('FAMILY_PLAN_EXPIRED');
        return;
      }
      setEditingExpense(expense);
      setIsFormOpen(true);
      setActionError(null);
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {
        /* ambiente de teste sem scrollTo */
      }
    },
    [isReadOnlyMember, openPremiumModal],
  );

  const handleCloseForm = useCallback((): void => {
    setIsFormOpen(false);
    setEditingExpense(null);
  }, []);

  const handleFormSuccess = useCallback((): void => {
    handleCloseForm();
    void refetch();
  }, [handleCloseForm, refetch]);

  const handleManualRefresh = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const handleDelete = useCallback(
    async (expense: Expense): Promise<void> => {
      if (isReadOnlyMember) {
        openPremiumModal('FAMILY_PLAN_EXPIRED');
        return;
      }
      setActionError(null);
      try {
        await remove(expense.id);
      } catch (err) {
        if (err instanceof ApiError && err.status === 402) {
          openPremiumModal(err.feature ?? 'FAMILY_PLAN_EXPIRED');
          return;
        }
        const message =
          err instanceof ApiError
            ? err.message
            : 'Não foi possível excluir a despesa.';
        setActionError(message);
      }
    },
    [isReadOnlyMember, openPremiumModal, remove],
  );

  const handleRestore = useCallback(
    async (expense: Expense): Promise<void> => {
      if (isReadOnlyMember) {
        openPremiumModal('FAMILY_PLAN_EXPIRED');
        return;
      }
      setActionError(null);
      try {
        await restore(expense.id);
      } catch (err) {
        if (err instanceof ApiError && err.status === 402) {
          openPremiumModal(err.feature ?? 'FAMILY_PLAN_EXPIRED');
          return;
        }
        const message =
          err instanceof ApiError
            ? err.message
            : 'Não foi possível restaurar a despesa.';
        setActionError(message);
      }
    },
    [isReadOnlyMember, openPremiumModal, restore],
  );

  const handleCancelRecurrence = useCallback(
    async (expense: Expense): Promise<void> => {
      if (isReadOnlyMember) {
        openPremiumModal('FAMILY_PLAN_EXPIRED');
        return;
      }
      setActionError(null);
      try {
        await cancelRecurrence(expense.id);
      } catch (err) {
        if (err instanceof ApiError && err.status === 402) {
          openPremiumModal(err.feature ?? 'FAMILY_PLAN_EXPIRED');
          return;
        }
        const message =
          err instanceof ApiError
            ? err.message
            : 'Não foi possível encerrar a recorrência.';
        setActionError(message);
      }
    },
    [isReadOnlyMember, openPremiumModal, cancelRecurrence],
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

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Atualizar lista de despesas"
            disabled={isRefreshing}
            onClick={() => void handleManualRefresh()}
            data-testid="expenses-refresh-button"
          >
            {isRefreshing ? (
              <Spinner label="Atualizando despesas…" />
            ) : (
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
            )}
          </Button>

          {!isFormOpen ? (
            <Button
              type="button"
              size="sm"
              onClick={handleOpenCreate}
              data-testid="expenses-new-button"
              className={cn(
                isReadOnlyMember &&
                  'border border-amber-400 bg-gradient-to-r from-amber-500 to-yellow-500 font-bold text-slate-950 hover:brightness-105',
              )}
            >
              {isReadOnlyMember ? (
                <Lock aria-hidden="true" className="h-3.5 w-3.5" />
              ) : (
                <Plus aria-hidden="true" className="h-4 w-4" />
              )}
              <span>Nova</span>
              {isReadOnlyMember && (
                <Crown aria-hidden="true" className="h-3.5 w-3.5" />
              )}
            </Button>
          ) : null}
        </div>
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
              onCategoryCreated={() => void refetchCategories()}
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

      {/* Listagem de despesas agrupada por tipo e recolhível */}
      {!isLoading && !error && expenses.length > 0 ? (
        <div className="flex flex-col gap-5" data-testid="expenses-list">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            />
            <Input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Buscar despesa por nome…"
              className="pl-9"
              data-testid="expenses-search-input"
            />
          </div>

          {filteredExpenses.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                Nenhuma despesa encontrada para &ldquo;{searchQuery}&rdquo;.
              </CardContent>
            </Card>
          ) : (
            EXPENSE_TYPE_GROUPS.map((group) => {
              const groupItems = filteredExpenses.filter((exp) => {
                const normalized =
                  exp.type === ExpenseType.RECURRENT ||
                  exp.type === ExpenseType.INSTALLMENT
                    ? exp.type
                    : ExpenseType.SINGLE;
                return normalized === group.type;
              });

              if (groupItems.length === 0) {
                return null;
              }

              const isCollapsed = Boolean(collapsedGroups[group.type]);
              const GroupIcon = group.icon;

              return (
                <section
                  key={group.type}
                  aria-label={`${group.label} (${groupItems.length})`}
                  data-testid={`expenses-group-${group.type}`}
                  className="flex flex-col gap-3"
                >
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.type)}
                    aria-expanded={!isCollapsed}
                    className={cn(
                      'flex w-full items-center justify-between rounded-md border px-3 py-2 text-left transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      group.headerClass,
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <GroupIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
                      <span className="text-sm font-semibold">{group.label}</span>
                      <span className="hidden text-xs opacity-75 sm:inline">
                        — {group.subtitle}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-semibold',
                          group.badgeClass,
                        )}
                      >
                        {groupItems.length}
                      </span>
                      <ChevronDown
                        aria-hidden="true"
                        className={cn(
                          'h-4 w-4 transition-transform duration-200',
                          isCollapsed && '-rotate-90',
                        )}
                      />
                    </div>
                  </button>

                  {!isCollapsed ? (
                    <ul className="flex flex-col gap-3">
                      {groupItems.map((expense) => (
                        <li key={expense.id}>
                          <ExpenseCard
                            expense={expense}
                            category={categoryById.get(expense.categoryId)}
                            isDeleted={expense.deletedAt !== null}
                            isBusy={pendingIds.has(expense.id)}
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
            })
          )}
        </div>
      ) : null}
    </section>
  );
}
