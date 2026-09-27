/**
 * ErrorBoundary.tsx — Barreira de erro global do React (TAREFA 11).
 *
 * Captura exceções lançadas durante a renderização, em métodos de ciclo de
 * vida e em construtores de qualquer componente da árvore filha, evitando o
 * "crash silencioso" que derruba toda a interface (ex: bug de edição de
 * despesas Recorrentes/Parceladas — TAREFA 12).
 *
 * Ao capturar um erro, exibe uma tela de fallback com a identidade visual
 * Aksurim (Dark Theme nativo) e oferece ações de recuperação:
 *  - "Tentar novamente": reseta o estado interno e re-renderiza a árvore.
 *  - "Recarregar aplicação": força um reload completo da página.
 *
 * REGRA (§8.1): proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  /** Árvore de componentes protegida pela barreira. */
  children: ReactNode;
  /** Conteúdo opcional exibido no lugar do fallback padrão. */
  fallback?: ReactNode;
  /** Callback opcional invocado sempre que um erro é capturado. */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  /** Erro capturado, ou `null` quando não há falha ativa. */
  error: Error | null;
}

/**
 * Barreira de erro baseada em classe (única forma suportada pelo React para
 * `componentDidCatch` / `getDerivedStateFromError`).
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  public state: ErrorBoundaryState = { error: null };

  /**
   * Atualiza o estado para renderizar o fallback na próxima passagem.
   */
  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  /**
   * Registra o erro no console e delega ao callback opcional do consumidor.
   */
  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // eslint-disable-next-line no-console -- log de diagnóstico obrigatório em barreira de erro
    console.error('[ErrorBoundary] Erro não tratado capturado:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  /**
   * Reseta o estado interno, permitindo nova tentativa de renderização.
   */
  private readonly handleReset = (): void => {
    this.setState({ error: null });
  };

  /**
   * Força o recarregamento completo da aplicação.
   */
  private readonly handleReload = (): void => {
    window.location.reload();
  };

  public render(): ReactNode {
    const { error } = this.state;
    const { children, fallback } = this.props;

    if (error === null) {
      return children;
    }

    if (fallback !== undefined) {
      return fallback;
    }

    return (
      <div className="bg-background flex min-h-screen flex-col items-center justify-center px-6 py-12 text-center">
        <div className="bg-card border-border flex w-full max-w-md flex-col items-center gap-5 rounded-lg border p-8 shadow-sm">
          <span className="bg-destructive/15 text-destructive flex h-14 w-14 items-center justify-center rounded-full">
            <AlertTriangle className="h-7 w-7" aria-hidden="true" />
          </span>

          <div className="flex flex-col gap-2">
            <h1 className="text-foreground text-xl font-semibold tracking-tight">
              Algo deu errado
            </h1>
            <p className="text-muted-foreground text-sm">
              Encontramos um problema inesperado ao exibir esta tela. Você pode
              tentar novamente ou recarregar a aplicação.
            </p>
          </div>

          {error.message.length > 0 && (
            <p className="bg-muted text-muted-foreground w-full break-words rounded-md px-3 py-2 text-left text-xs">
              {error.message}
            </p>
          )}

          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="default"
              className="w-full"
              onClick={this.handleReset}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Tentar novamente
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={this.handleReload}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Recarregar aplicação
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
