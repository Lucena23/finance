/**
 * ProtectedRoute.tsx - Guarda de rota autenticada (TAREFA 35).
 *
 * Redireciona para /login quando não há sessão ativa. Enquanto a sessão
 * inicial ainda está sendo hidratada do storage (isLoading), renderiza um
 * estado de carregamento para evitar redirecionamentos prematuros.
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Mail, LogOut } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';

/**
 * Envolve rotas que exigem autenticação. Utiliza <Outlet /> para renderizar
 * as rotas filhas quando o usuário está autenticado.
 */
export function ProtectedRoute(): JSX.Element {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-muted-foreground text-sm">Carregando...</span>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    // Preserva a rota de origem para redirecionar após o login.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!user.isEmailVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-aksurim-primary/10 text-aksurim-primary">
            <Mail size={32} />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Verifique seu e-mail</h1>
            <p className="text-sm text-muted-foreground">
              Enviamos um link de confirmação para <br />
              <strong className="text-foreground">{user.email}</strong>
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            Para acessar o sistema, clique no link que enviamos para sua caixa de entrada.
          </p>

          <div className="space-y-3 pt-4">
            <button 
              onClick={async () => {
                await logout();
                window.location.href = '/login';
              }}
              className="flex w-full items-center justify-center rounded-lg bg-aksurim-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-aksurim-primary/90"
            >
              Já ativei (Fazer login novamente)
            </button>
            <button
              onClick={() => logout()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <LogOut size={16} />
              Sair da conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
