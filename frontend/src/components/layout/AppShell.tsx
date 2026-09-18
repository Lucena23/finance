/**
 * AppShell.tsx — Layout base da aplicação autenticada (TAREFA 37).
 *
 * Estrutura mobile-first que envolve todas as telas internas:
 *  - Header fixo no topo (marca + navegação desktop + avatar).
 *  - Área de conteúdo central com padding inferior reservado para o
 *    BottomNav em mobile, evitando sobreposição de conteúdo.
 *  - BottomNav fixo na base (apenas mobile).
 *
 * O conteúdo das rotas filhas é renderizado via <Outlet /> do React Router.
 *
 * REGRA (§8.1): proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import { Outlet } from 'react-router-dom';

import { BottomNav } from './BottomNav';
import { Header } from './Header';

/**
 * Casca (shell) da aplicação autenticada. Deve envolver todas as rotas
 * internas protegidas por <ProtectedRoute />.
 */
export function AppShell(): JSX.Element {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <Header />

      {/* Conteúdo principal — pb-24 reserva espaço para o BottomNav mobile */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 md:pb-8">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
}
