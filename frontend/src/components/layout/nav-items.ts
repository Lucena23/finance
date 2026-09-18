/**
 * nav-items.ts — Definição centralizada dos itens de navegação (TAREFA 37).
 *
 * Fonte única de verdade para a navegação principal do AppShell. Consumida
 * tanto pelo BottomNav (mobile) quanto pela navegação lateral (desktop),
 * garantindo consistência de rotas, rótulos e ícones.
 *
 * REGRA (§8.1): proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import {
  LayoutDashboard,
  ListChecks,
  Receipt,
  Settings,
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
}

/**
 * Itens de navegação na ordem de exibição (Fila → Dashboard → Despesas →
 * Categorias → Configurações), conforme critério de aceite da TAREFA 37.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Fila', icon: ListChecks, end: true },
  { to: '/dashboard', label: 'Painel', icon: LayoutDashboard },
  { to: '/expenses', label: 'Despesas', icon: Receipt },
  { to: '/categories', label: 'Categorias', icon: Tags },
  { to: '/settings', label: 'Config', icon: Settings },
] as const;
