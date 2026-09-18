/**
 * PublicRoute.tsx — Guarda de rota pública (TAREFA 35).
 *
 * Impede que usuários já autenticados acessem telas de login/registro,
 * redirecionando-os para a rota principal (fila de pagamentos).
 */

import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth';

/**
 * Envolve rotas públicas (login/registro). Redireciona usuários autenticados
 * para a raiz da aplicação.
 */
export function PublicRoute(): JSX.Element {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-muted-foreground text-sm">Carregando…</span>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
