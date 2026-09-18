/**
 * ColorPicker.tsx — Seletor de cor para categorias (TAREFA 43).
 *
 * Apresenta uma paleta fixa de cores hexadecimais (#RRGGBB) e permite a
 * seleção acessível via teclado (radiogroup). O valor selecionado é
 * comunicado ao formulário pai via callback onChange.
 *
 * REGRA (§8.1): proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import { Check } from 'lucide-react';

import { cn } from '@/lib/cn';

/**
 * Paleta padrão de cores disponíveis para categorias.
 * Todas em formato hexadecimal de 7 caracteres (#RRGGBB — §8.8).
 */
export const CATEGORY_COLOR_PALETTE: readonly string[] = [
  '#EF4444', // vermelho
  '#F97316', // laranja
  '#F59E0B', // âmbar
  '#EAB308', // amarelo
  '#84CC16', // lima
  '#22C55E', // verde
  '#10B981', // esmeralda
  '#14B8A6', // teal
  '#06B6D4', // ciano
  '#3B82F6', // azul
  '#6366F1', // índigo
  '#8B5CF6', // violeta
  '#A855F7', // púrpura
  '#EC4899', // rosa
  '#64748B', // ardósia
  '#0F172A', // grafite
] as const;

interface ColorPickerProps {
  /** Cor atualmente selecionada (hex #RRGGBB). */
  value: string;
  /** Callback disparado ao selecionar uma nova cor. */
  onChange: (color: string) => void;
  /** Desabilita a interação (ex: durante o submit). */
  disabled?: boolean;
}

/**
 * Seletor de cor acessível baseado em radiogroup.
 */
export function ColorPicker({
  value,
  onChange,
  disabled = false,
}: ColorPickerProps): JSX.Element {
  return (
    <div
      role="radiogroup"
      aria-label="Selecione uma cor"
      className="flex flex-wrap gap-2"
      data-testid="category-color-picker"
    >
      {CATEGORY_COLOR_PALETTE.map((color) => {
        const isSelected = value.toUpperCase() === color.toUpperCase();

        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`Cor ${color}`}
            disabled={disabled}
            onClick={() => onChange(color)}
            data-testid={`category-color-${color}`}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-transform',
              'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              isSelected
                ? 'border-foreground scale-110'
                : 'border-transparent hover:scale-105',
            )}
            style={{ backgroundColor: color }}
          >
            {isSelected ? (
              <Check
                aria-hidden="true"
                className="h-4 w-4 text-white drop-shadow"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
