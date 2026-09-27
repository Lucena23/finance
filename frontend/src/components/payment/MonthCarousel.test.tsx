/**
 * MonthCarousel.test.tsx — Testes do seletor de meses em carrossel (TAREFA 16).
 *
 * Cobre:
 *  - Renderização dos meses e do atalho "Mês atual".
 *  - Seleção por clique.
 *  - Navegação por teclado (setas ← →, Home, End).
 *  - Preservação do filtro (o valor selecionado é refletido via aria-selected).
 *
 * REGRA (§8.1): proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { MonthCarousel } from '@/components/payment/MonthCarousel';

describe('MonthCarousel (TAREFA 16)', () => {
  it('renderiza o carrossel com o mês atual selecionado por padrão', () => {
    render(<MonthCarousel value={0} onSelect={vi.fn()} />);

    expect(screen.getByTestId('month-carousel')).toBeInTheDocument();
    expect(screen.getByTestId('month-option-0')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByTestId('month-current-shortcut')).toBeInTheDocument();
  });

  it('dispara onSelect ao clicar em um mês', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<MonthCarousel value={0} onSelect={onSelect} />);

    await user.click(screen.getByTestId('month-option-2'));

    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('navega com a seta direita movendo o foco para o próximo mês', async () => {
    const user = userEvent.setup();

    render(<MonthCarousel value={0} onSelect={vi.fn()} />);

    const active = screen.getByTestId('month-option-0');
    active.focus();
    await user.keyboard('{ArrowRight}');

    expect(screen.getByTestId('month-option-1')).toHaveFocus();
  });

  it('navega para o último mês com a tecla End', async () => {
    const user = userEvent.setup();

    render(<MonthCarousel value={0} onSelect={vi.fn()} count={6} />);

    screen.getByTestId('month-option-0').focus();
    await user.keyboard('{End}');

    expect(screen.getByTestId('month-option-5')).toHaveFocus();
  });

  it('retorna ao mês atual pelo atalho rápido', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<MonthCarousel value={3} onSelect={onSelect} />);

    await user.click(screen.getByTestId('month-current-shortcut'));

    expect(onSelect).toHaveBeenCalledWith(0);
  });

  it('desabilita o atalho "Mês atual" quando já está no mês atual', () => {
    render(<MonthCarousel value={0} onSelect={vi.fn()} />);

    expect(screen.getByTestId('month-current-shortcut')).toBeDisabled();
  });
});
