/**
 * MonthCarousel.tsx — Seletor de meses em formato carrossel (TAREFA 16).
 *
 * Substitui a antiga fileira de botões "pill" por um carrossel horizontal
 * elegante e profissional, com:
 *  - Rolagem horizontal suave com snap (scroll-snap) para navegação fluida.
 *  - Navegação por teclado (setas ← →, Home, End) com foco gerenciado
 *    (roving tabindex — apenas o item ativo é tabulável).
 *  - Botão rápido "Mês atual" sempre visível para retorno imediato.
 *  - Rótulos acessíveis (aria-label, aria-current) e região live.
 *
 * O componente é controlado: recebe o offset selecionado (0 = mês atual,
 * 1 = próximo mês, …) e notifica mudanças via `onSelect`. O estado do filtro
 * é preservado pelo componente pai (QueuePage) ao navegar entre páginas.
 *
 * REGRA (§8.1): proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import { addMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type KeyboardEvent,
} from 'react';

import { cn } from '@/lib/cn';

/**
 * Representa um mês disponível no carrossel.
 */
export interface MonthOption {
  /** Deslocamento em relação ao mês atual (0 = atual, 1 = próximo, …). */
  offset: number;
  /** Rótulo curto exibido no chip (ex: "SET/26"). */
  label: string;
  /** Nome completo do mês (ex: "Setembro"). */
  monthName: string;
  /** Ano com 4 dígitos (ex: 2026). */
  year: number;
  /** Mês numérico 1–12. */
  month: number;
}

interface MonthCarouselProps {
  /** Offset atualmente selecionado (0 = mês atual). */
  value: number;
  /** Callback disparado ao selecionar um novo mês. */
  onSelect: (offset: number) => void;
  /** Quantidade de meses exibidos a partir do mês atual (padrão: 12). */
  count?: number;
  /** Classes adicionais aplicadas ao contêiner raiz. */
  className?: string;
}

/**
 * Gera a lista de meses a partir do mês atual.
 *
 * @param count Quantidade de meses a projetar (inclui o mês atual).
 * @returns Lista tipada de opções de mês.
 */
function buildMonths(count: number): MonthOption[] {
  const base = new Date();

  return Array.from({ length: count }).map((_, index) => {
    const date = addMonths(base, index);

    return {
      offset: index,
      label: format(date, 'MMM/yy', { locale: ptBR }).toUpperCase(),
      monthName: format(date, 'MMMM', { locale: ptBR }),
      year: date.getFullYear(),
      month: date.getMonth() + 1,
    };
  });
}

/**
 * Carrossel horizontal de meses com navegação por teclado e botão "Mês atual".
 */
export function MonthCarousel({
  value,
  onSelect,
  count = 12,
  className,
}: MonthCarouselProps): JSX.Element {
  const months = useMemo<MonthOption[]>(() => buildMonths(count), [count]);
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Mantém o item ativo visível ao mudar a seleção (ex: via teclado).
  // `scrollIntoView` pode não existir em ambientes de teste (jsdom).
  useEffect(() => {
    const active = itemRefs.current[value];
    if (active && typeof active.scrollIntoView === 'function') {
      active.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [value]);

  const focusOffset = useCallback(
    (offset: number): void => {
      const clamped = Math.max(0, Math.min(months.length - 1, offset));
      const target = itemRefs.current[clamped];
      if (target) {
        target.focus();
      }
    },
    [months.length],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLUListElement>): void => {
      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault();
          focusOffset(value + 1);
          break;
        case 'ArrowLeft':
          event.preventDefault();
          focusOffset(value - 1);
          break;
        case 'Home':
          event.preventDefault();
          focusOffset(0);
          break;
        case 'End':
          event.preventDefault();
          focusOffset(months.length - 1);
          break;
        default:
          break;
      }
    },
    [focusOffset, months.length, value],
  );

  const handleStep = useCallback(
    (direction: -1 | 1): void => {
      const next = Math.max(0, Math.min(months.length - 1, value + direction));
      onSelect(next);
    },
    [months.length, onSelect, value],
  );

  const isCurrentMonth = value === 0;

  return (
    <div
      className={cn('flex flex-col gap-2', className)}
      data-testid="month-carousel"
    >
      <div className="flex items-center gap-2">
        {/* Botão de navegação: mês anterior */}
        <button
          type="button"
          aria-label="Mês anterior"
          onClick={() => handleStep(-1)}
          disabled={value === 0}
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border',
            'text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:pointer-events-none disabled:opacity-40',
          )}
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
        </button>

        {/* Trilha rolável de meses */}
        <ul
          ref={listRef}
          role="tablist"
          aria-label="Selecione o mês de referência"
          onKeyDown={handleKeyDown}
          className={cn(
            'flex flex-1 gap-2 overflow-x-auto scroll-smooth pb-1',
            'snap-x snap-mandatory scrollbar-hide',
          )}
        >
          {months.map((option) => {
            const isActive = option.offset === value;

            return (
              <li key={option.offset} className="snap-center">
                <button
                  ref={(node) => {
                    itemRefs.current[option.offset] = node;
                  }}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-current={isActive ? 'date' : undefined}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => onSelect(option.offset)}
                  data-testid={`month-option-${option.offset}`}
                  className={cn(
                    'flex min-w-[64px] flex-col items-center whitespace-nowrap rounded-xl border px-3 py-1.5 transition-all',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isActive
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <span className="text-xs font-bold leading-tight">
                    {option.label}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] leading-tight',
                      isActive ? 'text-primary-foreground/80' : 'text-muted-foreground/70',
                    )}
                  >
                    {option.year}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Botão de navegação: próximo mês */}
        <button
          type="button"
          aria-label="Próximo mês"
          onClick={() => handleStep(1)}
          disabled={value === months.length - 1}
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border',
            'text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:pointer-events-none disabled:opacity-40',
          )}
        >
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      {/* Atalho rápido para o mês atual */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {months[value]?.monthName} de {months[value]?.year}
        </span>
        <button
          type="button"
          onClick={() => onSelect(0)}
          disabled={isCurrentMonth}
          data-testid="month-current-shortcut"
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-semibold transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            isCurrentMonth
              ? 'cursor-default text-muted-foreground/50'
              : 'text-foreground hover:bg-muted',
          )}
        >
          <CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />
          Mês atual
        </button>
      </div>
    </div>
  );
}
