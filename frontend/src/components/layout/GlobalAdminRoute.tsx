/**
 * GlobalAdminRoute.tsx — Guarda de rota do Painel Aksurim (TAREFA 28 / RN-15).
 *
 * Restringe o acesso à rota "/admin" aos usuários com `isGlobalAdmin === true`.
 *
 * IMPORTANTE (RN-15): NÃO confundir com `Role.ADMIN` (chefe de família), que
 * permanece restrito ao seu próprio workspace. A flag `isGlobalAdmin` é o
 * ÚNICO critério válido para o Painel Aksurim.
 *
 * SEGURANÇA: esta guarda é apenas uma barreira de UX — ela evita renderizar a
 * tela para quem não tem a flag. A autorização REAL é sempre validada no
 * backend pelo GlobalAdminGuard, que revalida `isGlobalAdmin` no banco a cada
 * requisição. Nunca confiar apenas na flag do cliente.
 *
 * §8.1: proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth';

/**
 * Envolve rotas exclusivas do Admin Global. Redireciona para a raiz quando o
 * usuário autenticado não possui `isGlobalAdmin === true`.
 */
export function GlobalAdminRoute(): JSX.Element {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-muted-foreground text-sm">Carregando…</span>
      </div>
    );
  }

  if (user?.isGlobalAdmin !== true) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
