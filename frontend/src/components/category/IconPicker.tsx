/**
 * IconPicker.tsx — Seletor de ícone Lucide para categorias (TAREFA 43).
 *
 * Apresenta uma grade de ícones Lucide pré-selecionados e permite a escolha
 * acessível via teclado (radiogroup). O valor armazenado é o nome kebab-case
 * do ícone (ex: "home", "zap"), compatível com o campo `icon` da Category.
 *
 * REGRA (§8.1): proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import {
  Banknote,
  Bus,
  Car,
  CreditCard,
  Dumbbell,
  Film,
  GraduationCap,
  Heart,
  Home,
  Landmark,
  Lightbulb,
  type LucideIcon,
  Package,
  Phone,
  Pill,
  Plane,
  Receipt,
  ShoppingCart,
  Smartphone,
  Utensils,
  Wifi,
  Zap,
} from 'lucide-react';

import { cn } from '@/lib/cn';

/**
 * Catálogo de ícones disponíveis para categorias.
 * O `name` é persistido no campo `icon` da Category (kebab-case).
 */
export const CATEGORY_ICON_CATALOG: readonly {
  name: string;
  Icon: LucideIcon;
  label: string;
}[] = [
  { name: 'home', Icon: Home, label: 'Moradia' },
  { name: 'zap', Icon: Zap, label: 'Energia' },
  { name: 'lightbulb', Icon: Lightbulb, label: 'Utilidades' },
  { name: 'wifi', Icon: Wifi, label: 'Internet' },
  { name: 'smartphone', Icon: Smartphone, label: 'Celular' },
  { name: 'phone', Icon: Phone, label: 'Telefone' },
  { name: 'credit-card', Icon: CreditCard, label: 'Cartão' },
  { name: 'banknote', Icon: Banknote, label: 'Dinheiro' },
  { name: 'landmark', Icon: Landmark, label: 'Banco' },
  { name: 'receipt', Icon: Receipt, label: 'Contas' },
  { name: 'shopping-cart', Icon: ShoppingCart, label: 'Compras' },
  { name: 'utensils', Icon: Utensils, label: 'Alimentação' },
  { name: 'car', Icon: Car, label: 'Veículo' },
  { name: 'bus', Icon: Bus, label: 'Transporte' },
  { name: 'plane', Icon: Plane, label: 'Viagem' },
  { name: 'pill', Icon: Pill, label: 'Saúde' },
  { name: 'heart', Icon: Heart, label: 'Bem-estar' },
  { name: 'dumbbell', Icon: Dumbbell, label: 'Academia' },
  { name: 'graduation-cap', Icon: GraduationCap, label: 'Educação' },
  { name: 'film', Icon: Film, label: 'Lazer' },
  { name: 'package', Icon: Package, label: 'Outros' },
] as const;

/**
 * Resolve o componente Lucide correspondente a um nome de ícone.
 * Retorna `Package` como fallback quando o nome não está no catálogo.
 */
export function resolveCategoryIcon(name: string): LucideIcon {
  const found = CATEGORY_ICON_CATALOG.find((entry) => entry.name === name);
  return found ? found.Icon : Package;
}

interface IconPickerProps {
  /** Nome do ícone atualmente selecionado (kebab-case). */
  value: string;
  /** Callback disparado ao selecionar um novo ícone. */
  onChange: (iconName: string) => void;
  /** Desabilita a interação (ex: durante o submit). */
  disabled?: boolean;
}

/**
 * Seletor de ícone acessível baseado em radiogroup.
 */
export function IconPicker({
  value,
  onChange,
  disabled = false,
}: IconPickerProps): JSX.Element {
  return (
    <div
      role="radiogroup"
      aria-label="Selecione um ícone"
      className="grid grid-cols-6 gap-2 sm:grid-cols-8"
      data-testid="category-icon-picker"
    >
      {CATEGORY_ICON_CATALOG.map(({ name, Icon, label }) => {
        const isSelected = value === name;

        return (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={label}
            title={label}
            disabled={disabled}
            onClick={() => onChange(name)}
            data-testid={`category-icon-${name}`}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-md border transition-colors',
              'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              isSelected
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-input hover:bg-accent',
            )}
          >
            <Icon aria-hidden="true" className="h-5 w-5" />
          </button>
        );
      })}
    </div>
  );
}
