/**
 * BottomNav.tsx — Navegação inferior mobile-first (TAREFA 37).
 *
 * Barra de navegação fixa na base da viewport, otimizada para uso com o
 * polegar em smartphones Android (público-alvo primário). Exibe os itens
 * definidos em NAV_ITEMS com destaque visual do item ativo.
 *
 * TAREFA 28 — A lista de itens é obtida via `getNavItems(user.isGlobalAdmin)`,
 * de modo que a aba "Aksurim" (Painel Global) só aparece para o Admin Global
 * (RN-15). A filtragem é centralizada em nav-items.ts.
 *
 * Acessibilidade:
 *  - <nav> com aria-label descritivo.
 *  - Cada link usa aria-current="page" quando ativo.
 *  - Área de toque mínima de 44px (recomendação WCAG para mobile).
 *
 * REGRA (§8.1): proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import { NavLink } from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/cn';

import { getNavItems } from './nav-items';

/**
 * Barra de navegação inferior exibida apenas em telas pequenas (mobile).
 * Em telas md+ é ocultada, dando lugar à navegação lateral do AppShell.
 */
export function BottomNav(): JSX.Element {
  const { user } = useAuth();
  const items = getNavItems(user?.isGlobalAdmin === true);

  return (
    <nav
      aria-label="Navegação principal"
      className="bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <li key={item.to} className="min-w-0 flex-1">
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-[48px] flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-medium transition-colors sm:text-[11px]',
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
                        'h-5 w-5 shrink-0 transition-transform',
                        isActive && 'scale-110',
                      )}
                    />
                    <span className="max-w-full truncate">{item.label}</span>
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
