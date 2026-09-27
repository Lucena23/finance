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
 * REGRA (§8.1): proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import {
  BarChart3,
  LayoutDashboard,
  LifeBuoy,
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
 * Itens de navegação na ordem de exibição (Fila → Painel → Relatórios →
 * Despesas → Categorias → Configurações → Suporte), conforme critério de
 * aceite da TAREFA 37, a inclusão da tela de Relatórios (TAREFA 18 / RN-16)
 * e o item de Suporte (TAREFA 20).
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Fila', icon: ListChecks, end: true },
  { to: '/dashboard', label: 'Painel', icon: LayoutDashboard },
  { to: '/reports', label: 'Relatórios', icon: BarChart3 },
  { to: '/expenses', label: 'Despesas', icon: Receipt },
  { to: '/categories', label: 'Categorias', icon: Tags },
  { to: '/settings', label: 'Config', icon: Settings },
  { to: '/support', label: 'Suporte', icon: LifeBuoy },
] as const;
