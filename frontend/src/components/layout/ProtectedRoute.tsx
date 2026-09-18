/**
 * ProtectedRoute.tsx — Guarda de rota autenticada (TAREFA 35).
 *
 * Redireciona para /login quando não há sessão ativa. Enquanto a sessão
 * inicial ainda está sendo hidratada do storage (isLoading), renderiza um
 * estado de carregamento para evitar redirecionamentos prematuros.
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth';

/**
 * Envolve rotas que exigem autenticação. Utiliza <Outlet /> para renderizar
 * as rotas filhas quando o usuário está autenticado.
 */
export function ProtectedRoute(): JSX.Element {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-muted-foreground text-sm">Carregando…</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Preserva a rota de origem para redirecionar após o login.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
