/**
 * ExpensesPage.test.tsx — Testes de regressão da página de despesas.
 *
 * Cobre o bugfix da TAREFA 12: clicar em "Editar" numa despesa RECURRENT ou
 * INSTALLMENT deve abrir o formulário sem crash e sem impedir edições
 * subsequentes.
 *
 * REGRA (§8.1): proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ExpensesPage } from '@/pages/ExpensesPage';
import type { Category, Expense, Paginated } from '@/lib/api';
import { ExpenseRecurrenceStatus, ExpenseType } from '@/lib/constants';

const listMock = vi.fn<() => Promise<Paginated<Expense>>>();
const categoriesListMock = vi.fn<() => Promise<Category[]>>();

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    expensesApi: {
      ...actual.expensesApi,
      list: (...args: unknown[]) => listMock(...(args as [])),
      update: vi.fn(),
      create: vi.fn(),
      remove: vi.fn(),
      restore: vi.fn(),
      cancelRecurrence: vi.fn(),
    },
    categoriesApi: {
      ...actual.categoriesApi,
      list: (...args: unknown[]) => categoriesListMock(...(args as [])),
    },
  };
});

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

describe('ExpensesPage — edição de despesas (TAREFA 12)', () => {
  beforeEach(() => {
    listMock.mockReset();
    categoriesListMock.mockReset();
    categoriesListMock.mockResolvedValue(CATEGORIES);
  });

  it('abre o formulário ao editar uma despesa RECURRENT sem crash', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue({
      data: [
        buildExpense({
          id: 'exp-rec',
          type: ExpenseType.RECURRENT,
          title: 'Aluguel',
        }),
      ],
      total: 1,
      page: 1,
    });

    render(<ExpensesPage />);

    const editButton = await screen.findByTestId('expense-card-edit');
    await user.click(editButton);

    expect(await screen.findByTestId('expense-form')).toBeInTheDocument();
    expect(screen.getByTestId('expense-form-title')).toHaveValue('Aluguel');
  });

  it('abre o formulário ao editar uma despesa INSTALLMENT sem crash', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue({
      data: [
        buildExpense({
          id: 'exp-inst',
          type: ExpenseType.INSTALLMENT,
          title: 'Notebook',
        }),
      ],
      total: 1,
      page: 1,
    });

    render(<ExpensesPage />);

    const editButton = await screen.findByTestId('expense-card-edit');
    await user.click(editButton);

    expect(await screen.findByTestId('expense-form')).toBeInTheDocument();
    expect(screen.getByTestId('expense-form-title')).toHaveValue('Notebook');
  });

  it('permite editar uma despesa SINGLE após editar uma RECURRENT', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue({
      data: [
        buildExpense({
          id: 'exp-rec',
          type: ExpenseType.RECURRENT,
          title: 'Aluguel',
        }),
        buildExpense({
          id: 'exp-single',
          type: ExpenseType.SINGLE,
          title: 'Água',
        }),
      ],
      total: 2,
      page: 1,
    });

    render(<ExpensesPage />);

    const editButtons = await screen.findAllByTestId('expense-card-edit');

    // Edita a RECURRENT.
    await user.click(editButtons[0]);
    expect(await screen.findByTestId('expense-form')).toBeInTheDocument();
    expect(screen.getByTestId('expense-form-title')).toHaveValue('Aluguel');

    // Fecha o formulário.
    await user.click(screen.getByLabelText('Fechar formulário'));

    // Edita a SINGLE em seguida — não deve estar bloqueado.
    const editButtonsAgain = await screen.findAllByTestId('expense-card-edit');
    await user.click(editButtonsAgain[1]);

    await waitFor(() => {
      expect(screen.getByTestId('expense-form-title')).toHaveValue('Água');
    });
  });
});
