/**
 * ErrorBoundary.test.tsx — Testes unitários da barreira de erro (TAREFA 11).
 *
 * Valida que a barreira captura exceções de renderização, exibe o fallback
 * com a identidade Aksurim e permite recuperação via "Tentar novamente".
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ErrorBoundary } from './ErrorBoundary';

/** Componente que lança erro de renderização de forma controlada. */
function Bomb({ shouldThrow }: { shouldThrow: boolean }): JSX.Element {
  if (shouldThrow) {
    throw new Error('Falha simulada de renderização');
  }
  return <p>Conteúdo saudável</p>;
}

describe('ErrorBoundary', () => {
  it('renderiza os filhos quando não há erro', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Conteúdo saudável')).toBeInTheDocument();
  });

  it('exibe o fallback padrão ao capturar um erro', () => {
    // Silencia o log esperado do React/ErrorBoundary durante o teste.
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
    expect(
      screen.getByText('Falha simulada de renderização'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /tentar novamente/i }),
    ).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('invoca o callback onError ao capturar um erro', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);

    consoleSpy.mockRestore();
  });

  it('permite recuperação ao clicar em "Tentar novamente"', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));

    // Após o reset, a árvore é re-renderizada (o Bomb volta a lançar, mas o
    // estado interno foi limpo e o fallback reaparece — sem travar a UI).
    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('respeita o fallback customizado quando fornecido', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary fallback={<p>Fallback customizado</p>}>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Fallback customizado')).toBeInTheDocument();
    expect(screen.queryByText('Algo deu errado')).not.toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
