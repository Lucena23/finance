/**
 * BottomNav.tsx — Navegação inferior mobile-first (TAREFA 37).
 *
 * Barra de navegação fixa na base da viewport, otimizada para uso com o
 * polegar em smartphones Android (público-alvo primário). Exibe os itens
 * definidos em NAV_ITEMS com destaque visual do item ativo.
 *
 * Acessibilidade:
 *  - <nav> com aria-label descritivo.
 *  - Cada link usa aria-current="page" quando ativo.
 *  - Área de toque mínima de 44px (recomendação WCAG para mobile).
 *
 * REGRA (§8.1): proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import { NavLink } from 'react-router-dom';

import { cn } from '@/lib/cn';

import { NAV_ITEMS } from './nav-items';

/**
 * Barra de navegação inferior exibida apenas em telas pequenas (mobile).
 * Em telas md+ é ocultada, dando lugar à navegação lateral do AppShell.
 */
export function BottomNav(): JSX.Element {
  return (
    <nav
      aria-label="Navegação principal"
      className="bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;

          return (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-[44px] flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      aria-hidden="true"
                      className={cn(
                        'h-5 w-5 transition-transform',
                        isActive && 'scale-110',
                      )}
                    />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
