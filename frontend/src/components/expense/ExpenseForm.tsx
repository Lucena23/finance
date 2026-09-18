/**
 * ExpenseForm.tsx — Formulário de criação/edição de despesas (TAREFA 42).
 *
 * Suporta os três tipos fundamentais de despesa (RN-05 / §8.4):
 *  - SINGLE:      despesa avulsa — exige dueDate (vencimento único).
 *  - INSTALLMENT: despesa parcelada — exige dueDate (1º vencimento) e
 *                 totalInstallments (N >= 2).
 *  - RECURRENT:   despesa recorrente — exige dueDate (1º vencimento);
 *                 projeção mensal contínua (sem quantidade final).
 *
 * Campos condicionais são exibidos conforme o tipo selecionado. O valor
 * monetário é digitado em reais e convertido para centavos (Int) via
 * parseCurrencyToCents antes do envio à API (§8.2 — regra inegociável).
 *
 * REGRA (§8.1): proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import { Loader2, Save } from 'lucide-react';
import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ApiError,
  expensesApi,
  type Category,
  type Expense,
  type ExpenseWithItems,
} from '@/lib/api';
import { cn } from '@/lib/cn';
import { ExpenseType } from '@/lib/constants';
import { parseCurrencyToCents } from '@/lib/utils';

/**
 * Payload normalizado emitido pelo formulário ao confirmar.
 * Os valores monetários já estão convertidos para centavos (Int).
 */
export interface ExpenseFormValues {
  title: string;
  description?: string;
  type: ExpenseType;
  totalAmount: number;
  categoryId: string;
  dueDate: string;
  totalInstallments?: number;
}

interface ExpenseFormProps {
  /** Categorias disponíveis para seleção (escopo do workspace). */
  categories: Category[];
  /** Despesa existente para edição. Quando ausente, o formulário cria. */
  expense?: Expense | null;
  /** Callback disparado após criação/edição bem-sucedida. */
  onSuccess?: (expense: ExpenseWithItems | Expense) => void;
  /** Callback disparado ao cancelar o formulário. */
  onCancel?: () => void;
}

/**
 * Rótulos amigáveis de cada tipo de despesa.
 */
const TYPE_OPTIONS: readonly { value: ExpenseType; label: string; hint: string }[] =
  [
    {
      value: ExpenseType.SINGLE,
      label: 'Avulsa',
      hint: 'Cobrança única com vencimento informado.',
    },
    {
      value: ExpenseType.INSTALLMENT,
      label: 'Parcelada',
      hint: 'Dividida em N parcelas mensais.',
    },
    {
      value: ExpenseType.RECURRENT,
      label: 'Recorrente',
      hint: 'Projeção mensal contínua, sem fim definido.',
    },
  ] as const;

/**
 * Retorna a data de hoje no formato "YYYY-MM-DD" no fuso America/Sao_Paulo,
 * adequado ao atributo `date` de um <input type="date">.
 */
function todayIsoDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Converte uma data "YYYY-MM-DD" (input date) em timestamp ISO 8601 ancorado
 * ao meio-dia UTC, evitando deslocamento de dia por fuso horário.
 */
function isoDateToTimestamp(value: string): string {
  const [year, month, day] = value.split('-').map((part) => Number(part));

  if (!year || !month || !day) {
    return new Date().toISOString();
  }

  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).toISOString();
}

/**
 * Formulário de criação/edição de despesas dos três tipos.
 */
export function ExpenseForm({
  categories,
  expense,
  onSuccess,
  onCancel,
}: ExpenseFormProps): JSX.Element {
  const titleFieldId = useId();
  const descriptionFieldId = useId();
  const amountFieldId = useId();
  const categoryFieldId = useId();
  const dueDateFieldId = useId();
  const installmentsFieldId = useId();

  const isEditing = Boolean(expense);

  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [type, setType] = useState<ExpenseType>(ExpenseType.SINGLE);
  const [amountInput, setAmountInput] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>(todayIsoDate());
  const [installmentsInput, setInstallmentsInput] = useState<string>('2');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sincroniza o formulário com a despesa em edição.
  useEffect(() => {
    if (expense) {
      setTitle(expense.title);
      setDescription(expense.description ?? '');
      setType(expense.type);
      setAmountInput((expense.totalAmount / 100).toFixed(2).replace('.', ','));
      setCategoryId(expense.categoryId);
      setDueDate(todayIsoDate());
    }
  }, [expense]);

  // Pré-seleciona a primeira categoria disponível ao criar.
  useEffect(() => {
    if (!expense && categoryId === '' && categories.length > 0) {
      setCategoryId(categories[0].id);
    }
  }, [expense, categoryId, categories]);

  const totalAmountCents = useMemo<number>(
    () => parseCurrencyToCents(amountInput),
    [amountInput],
  );

  const totalInstallments = useMemo<number>(() => {
    const parsed = Number.parseInt(installmentsInput, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [installmentsInput]);

  const isInstallment = type === ExpenseType.INSTALLMENT;
  const isRecurrent = type === ExpenseType.RECURRENT;

  const isTitleValid = title.trim().length > 0;
  const isAmountValid = totalAmountCents > 0;
  const isCategoryValid = categoryId.length > 0;
  const isDueDateValid = dueDate.length > 0;
  const isInstallmentsValid = !isInstallment || totalInstallments >= 2;

  const isFormValid =
    isTitleValid &&
    isAmountValid &&
    isCategoryValid &&
    isDueDateValid &&
    isInstallmentsValid;

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();

    if (!isFormValid) {
      setError('Preencha todos os campos obrigatórios corretamente.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditing && expense) {
        const updated = await expensesApi.update(expense.id, {
          title: title.trim(),
          description:
            description.trim().length > 0 ? description.trim() : undefined,
          categoryId,
          totalAmount: totalAmountCents,
        });
        onSuccess?.(updated);
      } else {
        const created = await expensesApi.create({
          title: title.trim(),
          description:
            description.trim().length > 0 ? description.trim() : undefined,
          type,
          totalAmount: totalAmountCents,
          categoryId,
          dueDate: isoDateToTimestamp(dueDate),
          totalInstallments: isInstallment ? totalInstallments : undefined,
        });
        onSuccess?.(created);
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Não foi possível salvar a despesa. Tente novamente.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="flex flex-col gap-4"
      data-testid="expense-form"
    >
      {/* Título */}
      <div className="flex flex-col gap-2">
        <Label htmlFor={titleFieldId}>Título *</Label>
        <Input
          id={titleFieldId}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ex: Conta de energia"
          autoComplete="off"
          aria-invalid={!isTitleValid && title.length > 0}
          data-testid="expense-form-title"
        />
      </div>

      {/* Descrição */}
      <div className="flex flex-col gap-2">
        <Label htmlFor={descriptionFieldId}>Descrição (opcional)</Label>
        <textarea
          id={descriptionFieldId}
          rows={2}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Detalhes adicionais da despesa…"
          data-testid="expense-form-description"
          className={cn(
            'border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          )}
        />
      </div>

      {/* Tipo de despesa (somente na criação) */}
      {!isEditing ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium leading-none">Tipo *</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {TYPE_OPTIONS.map((option) => {
              const isSelected = type === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setType(option.value)}
                  aria-pressed={isSelected}
                  data-testid={`expense-form-type-${option.value}`}
                  className={cn(
                    'flex flex-col gap-1 rounded-md border p-3 text-left transition-colors',
                    'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-input hover:bg-accent',
                  )}
                >
                  <span className="text-sm font-semibold">{option.label}</span>
                  <span className="text-muted-foreground text-xs">
                    {option.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {/* Valor total */}
      <div className="flex flex-col gap-2">
        <Label htmlFor={amountFieldId}>
          {isInstallment ? 'Valor total (R$) *' : 'Valor (R$) *'}
        </Label>
        <Input
          id={amountFieldId}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          value={amountInput}
          onChange={(event) => setAmountInput(event.target.value)}
          aria-invalid={!isAmountValid && amountInput.length > 0}
          data-testid="expense-form-amount"
        />
        {isInstallment && isAmountValid && totalInstallments >= 2 ? (
          <p className="text-muted-foreground text-xs">
            {totalInstallments}x de aproximadamente{' '}
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(Math.floor(totalAmountCents / totalInstallments) / 100)}
            .
          </p>
        ) : null}
      </div>

      {/* Categoria */}
      <div className="flex flex-col gap-2">
        <Label htmlFor={categoryFieldId}>Categoria *</Label>
        <select
          id={categoryFieldId}
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          aria-invalid={!isCategoryValid}
          data-testid="expense-form-category"
          className={cn(
            'border-input bg-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          <option value="" disabled>
            Selecione uma categoria
          </option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* Vencimento (SINGLE / INSTALLMENT / RECURRENT) */}
      {!isEditing ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor={dueDateFieldId}>
            {isRecurrent
              ? 'Primeiro vencimento *'
              : isInstallment
                ? 'Vencimento da 1ª parcela *'
                : 'Vencimento *'}
          </Label>
          <Input
            id={dueDateFieldId}
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            aria-invalid={!isDueDateValid}
            data-testid="expense-form-due-date"
          />
        </div>
      ) : null}

      {/* Número de parcelas (INSTALLMENT) */}
      {!isEditing && isInstallment ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor={installmentsFieldId}>Número de parcelas *</Label>
          <Input
            id={installmentsFieldId}
            type="number"
            min={2}
            step={1}
            inputMode="numeric"
            value={installmentsInput}
            onChange={(event) => setInstallmentsInput(event.target.value)}
            aria-invalid={!isInstallmentsValid}
            data-testid="expense-form-installments"
          />
          {!isInstallmentsValid ? (
            <p className="text-destructive text-xs">
              Informe no mínimo 2 parcelas.
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="text-destructive text-sm font-medium"
          data-testid="expense-form-error"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 pt-2 sm:flex-row-reverse">
        <Button
          type="submit"
          disabled={isSubmitting || !isFormValid}
          className="w-full sm:w-auto"
          data-testid="expense-form-submit"
        >
          {isSubmitting ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <Save aria-hidden="true" className="h-4 w-4" />
          )}
          {isEditing ? 'Salvar alterações' : 'Criar despesa'}
        </Button>
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={onCancel}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  );
}
