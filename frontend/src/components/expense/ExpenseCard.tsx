/**
 * ExpenseCard.tsx — Card de uma despesa na listagem (TAREFA 42).
 *
 * Apresenta os dados essenciais de uma despesa: título, categoria, tipo,
 * valor total formatado (via formatCurrency — §8.2) e status de recorrência.
 * Expõe ações de editar, excluir (soft delete — RN-11) e restaurar.
 *
 * REGRA (§8.1): proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import {
  Ban,
  CalendarClock,
  Layers,
  Pencil,
  Repeat,
  RotateCcw,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Category, Expense } from '@/lib/api';
import { cn } from '@/lib/cn';
import { ExpenseRecurrenceStatus, ExpenseType } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/utils';

interface ExpenseCardProps {
  /** Despesa a ser exibida. */
  expense: Expense;
  /** Categoria vinculada (para exibir nome e cor). */
  category?: Category;
  /** Indica se a despesa está excluída (soft delete) — habilita restaurar. */
  isDeleted?: boolean;
  /** Callback de edição. */
  onEdit?: (expense: Expense) => void;
  /** Callback de exclusão (soft delete). */
  onDelete?: (expense: Expense) => void;
  /** Callback de restauração. */
  onRestore?: (expense: Expense) => void;
  /** Callback de encerramento de recorrência. */
  onCancelRecurrence?: (expense: Expense) => void;
}

/**
 * Rótulo amigável de cada tipo de despesa.
 */
const TYPE_LABEL: Record<ExpenseType, string> = {
  [ExpenseType.SINGLE]: 'Avulsa',
  [ExpenseType.INSTALLMENT]: 'Parcelada',
  [ExpenseType.RECURRENT]: 'Recorrente',
};

/**
 * Ícone correspondente a cada tipo de despesa.
 */
function TypeIcon({ type }: { type: ExpenseType }): JSX.Element {
  if (type === ExpenseType.RECURRENT) {
    return <Repeat aria-hidden="true" className="h-3.5 w-3.5" />;
  }

  if (type === ExpenseType.INSTALLMENT) {
    return <Layers aria-hidden="true" className="h-3.5 w-3.5" />;
  }

  return <CalendarClock aria-hidden="true" className="h-3.5 w-3.5" />;
}

/**
 * Card de uma despesa com ações de gestão.
 */
export function ExpenseCard({
  expense,
  category,
  isDeleted = false,
  onEdit,
  onDelete,
  onRestore,
  onCancelRecurrence,
}: ExpenseCardProps): JSX.Element {
  const isRecurrent = expense.type === ExpenseType.RECURRENT;
  const isRecurrenceCancelled =
    expense.statusRecurrence === ExpenseRecurrenceStatus.CANCELLED;

  return (
    <Card
      data-testid="expense-card"
      data-expense-id={expense.id}
      className={cn(isDeleted && 'opacity-60')}
    >
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="truncate text-sm font-semibold">
              {expense.title}
            </span>

            <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
              {category ? (
                <span className="inline-flex items-center gap-1">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  {category.name}
                </span>
              ) : null}

              <span className="inline-flex items-center gap-1">
                <TypeIcon type={expense.type} />
                {TYPE_LABEL[expense.type]}
              </span>

              {isRecurrent ? (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                    isRecurrenceCancelled
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-emerald-100 text-emerald-700',
                  )}
                >
                  {isRecurrenceCancelled ? 'Encerrada' : 'Ativa'}
                </span>
              ) : null}

              {isDeleted ? (
                <span className="bg-destructive/10 text-destructive rounded-full px-2 py-0.5 text-[11px] font-semibold">
                  Excluída
                </span>
              ) : null}
            </div>

            {expense.description ? (
              <p className="text-muted-foreground line-clamp-2 text-xs">
                {expense.description}
              </p>
            ) : null}
          </div>

          <span className="shrink-0 text-sm font-bold tabular-nums">
            {formatCurrency(expense.totalAmount)}
          </span>
        </div>

        <div className="text-muted-foreground flex items-center justify-between text-[11px]">
          <span>Criada em {formatDate(expense.createdAt)}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isDeleted ? (
            onRestore ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onRestore(expense)}
                data-testid="expense-card-restore"
              >
                <RotateCcw aria-hidden="true" className="h-4 w-4" />
                Restaurar
              </Button>
            ) : null
          ) : (
            <>
              {onEdit ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(expense)}
                  data-testid="expense-card-edit"
                >
                  <Pencil aria-hidden="true" className="h-4 w-4" />
                  Editar
                </Button>
              ) : null}

              {isRecurrent && !isRecurrenceCancelled && onCancelRecurrence ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onCancelRecurrence(expense)}
                  data-testid="expense-card-cancel-recurrence"
                >
                  <Ban aria-hidden="true" className="h-4 w-4" />
                  Encerrar recorrência
                </Button>
              ) : null}

              {onDelete ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => onDelete(expense)}
                  data-testid="expense-card-delete"
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                  Excluir
                </Button>
              ) : null}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
