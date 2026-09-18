/**
 * useAuth.ts — Hook de consumo do AuthContext (TAREFA 35).
 *
 * Garante que o hook seja utilizado exclusivamente dentro de um AuthProvider,
 * lançando erro explícito caso contrário (evita bugs silenciosos de contexto).
 */

import { useContext } from 'react';

import { AuthContext, type AuthContextValue } from '@/contexts/AuthContext';

/**
 * Acessa o estado e as operações de autenticação.
 *
 * @returns O valor do AuthContext (user, token, isAuthenticated, login, etc.).
 * @throws Error se invocado fora de um <AuthProvider>.
 *
 * @example
 * const { user, login, logout, isAuthenticated } = useAuth();
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error(
      'useAuth deve ser utilizado dentro de um <AuthProvider>. ' +
        'Envolva a árvore de componentes com <AuthProvider> no main.tsx.',
    );
  }

  return context;
}
