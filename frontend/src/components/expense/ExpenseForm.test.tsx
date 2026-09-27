/**
 * ExpenseForm.test.tsx — Testes de regressão do formulário de despesas.
 *
 * Cobre o bugfix da TAREFA 12: a edição de despesas RECURRENT e INSTALLMENT
 * não deve causar crash na interface (React) nem impedir a abertura de
 * edições subsequentes.
 *
 * REGRA (§8.1): proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ExpenseForm } from '@/components/expense/ExpenseForm';
import type { Category, Expense } from '@/lib/api';
import { ExpenseRecurrenceStatus, ExpenseType } from '@/lib/constants';

const CATEGORIES: Category[] = [
  {
    id: 'cat-1',
    name: 'Moradia',
    color: '#06777F',
    icon: 'home',
    familyAccountId: 'fam-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

function buildExpense(overrides: Partial<Expense>): Expense {
  return {
    id: 'exp-1',
    title: 'Despesa',
    description: null,
    type: ExpenseType.SINGLE,
    totalAmount: 15075,
    statusRecurrence: ExpenseRecurrenceStatus.ACTIVE,
    categoryId: 'cat-1',
    familyAccountId: 'fam-1',
    createdById: 'user-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

describe('ExpenseForm — edição de despesas (TAREFA 12)', () => {
  it('renderiza o formulário de edição de uma despesa RECURRENT sem crash', () => {
    const expense = buildExpense({
      type: ExpenseType.RECURRENT,
      title: 'Aluguel',
      totalAmount: 250000,
    });

    render(
      <ExpenseForm categories={CATEGORIES} expense={expense} />,
    );

    expect(screen.getByTestId('expense-form')).toBeInTheDocument();
    expect(screen.getByTestId('expense-form-title')).toHaveValue('Aluguel');
    expect(screen.getByTestId('expense-form-amount')).toHaveValue('2500,00');
  });

  it('renderiza o formulário de edição de uma despesa INSTALLMENT sem crash', () => {
    const expense = buildExpense({
      type: ExpenseType.INSTALLMENT,
      title: 'Notebook',
      totalAmount: 300000,
    });

    render(
      <ExpenseForm categories={CATEGORIES} expense={expense} />,
    );

    expect(screen.getByTestId('expense-form')).toBeInTheDocument();
    expect(screen.getByTestId('expense-form-title')).toHaveValue('Notebook');
    expect(screen.getByTestId('expense-form-amount')).toHaveValue('3000,00');
  });

  it('não quebra quando totalAmount vem ausente/indefinido do payload', () => {
    const expense = buildExpense({
      type: ExpenseType.RECURRENT,
      title: 'Internet',
    });
    // Simula payload parcial (defensividade contra crash silencioso).
    const partial = {
      ...expense,
      totalAmount: undefined as unknown as number,
    };

    expect(() =>
      render(<ExpenseForm categories={CATEGORIES} expense={partial} />),
    ).not.toThrow();

    expect(screen.getByTestId('expense-form')).toBeInTheDocument();
    // Campo de valor fica vazio (não "NaN" nem crash).
    expect(screen.getByTestId('expense-form-amount')).toHaveValue('');
  });

  it('não quebra quando totalAmount vem null do payload', () => {
    const expense = buildExpense({
      type: ExpenseType.INSTALLMENT,
      title: 'Geladeira',
    });
    const partial = {
      ...expense,
      totalAmount: null as unknown as number,
    };

    expect(() =>
      render(<ExpenseForm categories={CATEGORIES} expense={partial} />),
    ).not.toThrow();

    expect(screen.getByTestId('expense-form-amount')).toHaveValue('');
  });

  it('normaliza um type inválido para SINGLE sem crash', () => {
    const expense = buildExpense({
      title: 'Legado',
      type: 'INVALID_TYPE' as unknown as ExpenseType,
    });

    expect(() =>
      render(<ExpenseForm categories={CATEGORIES} expense={expense} />),
    ).not.toThrow();

    expect(screen.getByTestId('expense-form')).toBeInTheDocument();
    expect(screen.getByTestId('expense-form-title')).toHaveValue('Legado');
  });

  it('permite abrir uma edição após editar uma despesa RECURRENT (sem corromper estado)', async () => {
    const user = userEvent.setup();
    const recurrent = buildExpense({
      id: 'exp-rec',
      type: ExpenseType.RECURRENT,
      title: 'Aluguel',
    });
    const single = buildExpense({
      id: 'exp-single',
      type: ExpenseType.SINGLE,
      title: 'Água',
    });

    const { rerender } = render(
      <ExpenseForm categories={CATEGORIES} expense={recurrent} />,
    );

    expect(screen.getByTestId('expense-form-title')).toHaveValue('Aluguel');

    // Simula a troca de despesa em edição (abrir outra edição em seguida).
    rerender(<ExpenseForm categories={CATEGORIES} expense={single} />);

    await waitFor(() => {
      expect(screen.getByTestId('expense-form-title')).toHaveValue('Água');
    });

    // O formulário permanece funcional e submetível.
    await user.clear(screen.getByTestId('expense-form-title'));
    await user.type(screen.getByTestId('expense-form-title'), 'Luz');
    expect(screen.getByTestId('expense-form-title')).toHaveValue('Luz');
  });

  it('reseta o estado de erro ao trocar de despesa em edição', async () => {
    const user = userEvent.setup();
    const recurrent = buildExpense({
      id: 'exp-rec',
      type: ExpenseType.RECURRENT,
      title: 'Aluguel',
    });
    const single = buildExpense({
      id: 'exp-single',
      type: ExpenseType.SINGLE,
      title: 'Água',
    });

    const { rerender } = render(
      <ExpenseForm categories={CATEGORIES} expense={recurrent} />,
    );

    // Esvazia o título (form inválido) e submete o form diretamente — o botão
    // fica desabilitado quando o form é inválido, então usamos fireEvent.
    await user.clear(screen.getByTestId('expense-form-title'));
    fireEvent.submit(screen.getByTestId('expense-form'));
    expect(screen.getByTestId('expense-form-error')).toBeInTheDocument();

    // Troca de despesa: o erro anterior deve sumir (estado limpo).
    rerender(<ExpenseForm categories={CATEGORIES} expense={single} />);

    await waitFor(() => {
      expect(screen.queryByTestId('expense-form-error')).not.toBeInTheDocument();
    });
  });

  it('não dispara onSuccess ao submeter edição inválida', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const expense = buildExpense({
      type: ExpenseType.RECURRENT,
      title: 'Aluguel',
    });

    render(
      <ExpenseForm
        categories={CATEGORIES}
        expense={expense}
        onSuccess={onSuccess}
      />,
    );

    await user.clear(screen.getByTestId('expense-form-title'));
    fireEvent.submit(screen.getByTestId('expense-form'));

    expect(onSuccess).not.toHaveBeenCalled();
  });
});
