/**
 * nav-items.ts — Definição centralizada dos itens de navegação (TAREFA 37).
 *
 * Fonte única de verdade para a navegação principal do AppShell. Consumida
 * tanto pelo BottomNav (mobile) quanto pela navegação lateral (desktop),
 * garantindo consistência de rotas, rótulos e ícones.
 *
 * TAREFA 18 — Adicionado o item "Relatórios" (/reports), tornando a tela de
 * relatórios acessível a partir de ambos os pontos de navegação global
 * (BottomNav.tsx mobile e navegação horizontal do Header.tsx desktop), que
 * consomem este array como fonte única de verdade (RN-16).
 *
 * TAREFA 20 — Adicionado o item "Suporte" (/support), expondo o formulário de
 * contato com o suporte Aksurim (via Telegram) no menu de navegação global
 * (BLUEPRINT §4 — "Novo item no menu").
 *
 * TAREFA 28 — Adicionado o item "Painel Aksurim" (/admin), EXIBIDO
 * CONDICIONALMENTE apenas quando `user.isGlobalAdmin === true` (RN-15). A
 * função `getNavItems(isGlobalAdmin)` é a fonte única de verdade para a
 * filtragem, garantindo que a aba apareça em ambos os pontos de navegação
 * (BottomNav mobile e Header desktop) de forma consistente.
 *
 * REGRA (§8.1): proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import {
  BarChart3,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  Receipt,
  Settings,
  ShieldCheck,
  Tags,
  type LucideIcon,
} from 'lucide-react';

/**
 * Item de navegação principal da aplicação.
 */
export interface NavItem {
  /** Rota absoluta do React Router. */
  to: string;
  /** Rótulo exibido ao usuário. */
  label: string;
  /** Ícone Lucide associado ao item. */
  icon: LucideIcon;
  /**
   * Indica se o item deve ser considerado ativo apenas em correspondência
   * exata de rota (usado pela rota raiz "/").
   */
  end?: boolean;
  /**
   * Quando `true`, o item só é exibido para usuários com
   * `isGlobalAdmin === true` (RN-15 / TAREFA 28).
   */
  globalAdminOnly?: boolean;
}

/**
 * Itens de navegação na ordem de exibição (Fila → Painel → Relatórios →
 * Despesas → Categorias → Configurações → Suporte → Painel Aksurim),
 * conforme critério de aceite da TAREFA 37, a inclusão da tela de Relatórios
 * (TAREFA 18 / RN-16), o item de Suporte (TAREFA 20) e o item condicional do
 * Painel Aksurim (TAREFA 28 / RN-15).
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Fila', icon: ListChecks, end: true },
  { to: '/dashboard', label: 'Painel', icon: LayoutDashboard },
  { to: '/expenses', label: 'Despesas', icon: Receipt },
  { to: '/categories', label: 'Categorias', icon: Tags },
  { to: '/settings', label: 'Config', icon: Settings },
  { to: '/support', label: 'Suporte', icon: LifeBuoy },
  {
    to: '/admin',
    label: 'Aksurim',
    icon: ShieldCheck,
    globalAdminOnly: true,
  },
] as const;

/**
 * Retorna os itens de navegação visíveis para o usuário corrente.
 *
 * Itens marcados com `globalAdminOnly` são incluídos APENAS quando
 * `isGlobalAdmin === true` (RN-15 / TAREFA 28). Esta é a fonte única de
 * verdade da filtragem, consumida por BottomNav e Header.
 *
 * @param isGlobalAdmin Flag `user.isGlobalAdmin` do usuário autenticado.
 * @returns Lista de itens de navegação visíveis.
 */
export function getNavItems(isGlobalAdmin: boolean): readonly NavItem[] {
  return NAV_ITEMS.filter(
    (item) => !item.globalAdminOnly || isGlobalAdmin,
  );
}
