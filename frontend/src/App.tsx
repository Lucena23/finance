import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { PublicRoute } from '@/components/layout/PublicRoute';
import { useAuth } from '@/hooks/useAuth';

/**
 * App — Roteamento principal do Finanças Aksurim.
 *
 * Estrutura de rotas (TAREFA 35):
 *  - Rotas públicas (/login, /register) protegidas por <PublicRoute>.
 *  - Rotas autenticadas protegidas por <ProtectedRoute>.
 *
 * As páginas reais de login/registro e as telas internas são implementadas
 * nas tarefas subsequentes (36+). Placeholders mínimos são renderizados para
 * validar o fluxo de autenticação e o pipeline de build (tsc + vite build).
 */
export function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas públicas — redirecionam se já autenticado */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPlaceholder />} />
          <Route path="/register" element={<RegisterPlaceholder />} />
        </Route>

        {/* Rotas autenticadas — redirecionam para /login se não autenticado */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<HomePlaceholder />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function LoginPlaceholder(): JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-2xl font-bold">Entrar</h1>
      <p className="text-muted-foreground text-sm">
        Tela de login — implementação na TAREFA 36.
      </p>
    </main>
  );
}

function RegisterPlaceholder(): JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-2xl font-bold">Criar conta</h1>
      <p className="text-muted-foreground text-sm">
        Tela de registro — implementação na TAREFA 36.
      </p>
    </main>
  );
}

function HomePlaceholder(): JSX.Element {
  const { user, logout } = useAuth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold">Finanças Aksurim</h1>
      <p className="text-muted-foreground text-sm">
        Sessão ativa para <strong>{user?.name}</strong> ({user?.initials}).
      </p>
      <button
        type="button"
        onClick={logout}
        className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium"
      >
        Sair
      </button>
    </main>
  );
}
