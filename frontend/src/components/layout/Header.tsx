/**
 * Header.tsx — Cabeçalho superior da aplicação (TAREFA 37).
 *
 * Exibe a marca "Finanças Aksurim" e o avatar do usuário autenticado com
 * suas iniciais e cor personalizada (RN-08 / §8.8). Em telas md+ apresenta
 * também a navegação lateral horizontal, complementando o BottomNav mobile.
 *
 * Acessibilidade:
 *  - <header> semântico com role implícito de banner.
 *  - Avatar com aria-label contendo o nome do usuário.
 *
 * REGRA (§8.1): proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import { NavLink } from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/cn';

import { NAV_ITEMS } from './nav-items';

/**
 * Cabeçalho fixo no topo, com marca, navegação desktop e avatar do usuário.
 */
export function Header(): JSX.Element {
  const { user } = useAuth();

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        {/* Marca */}
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold"
          >
            FA
          </span>
          <span className="text-base font-semibold tracking-tight">
            Finanças Aksurim
          </span>
        </div>

        {/* Navegação horizontal — visível apenas em desktop/tablet */}
        <nav
          aria-label="Navegação principal"
          className="hidden md:flex md:items-center md:gap-1"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isActive
                      ? 'bg-secondary text-secondary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )
                }
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Avatar do usuário autenticado */}
        {user ? (
          <div
            aria-label={`Usuário autenticado: ${user.name}`}
            title={user.name}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: user.avatarColor }}
          >
            {user.initials}
          </div>
        ) : null}
      </div>
    </header>
  );
}
