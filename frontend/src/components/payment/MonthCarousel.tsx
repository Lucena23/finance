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

export interface MonthOption {
  offset: number;
  label: string;
  monthName: string;
  year: number;
  month: number;
}

interface MonthCarouselProps {
  value: number;
  onSelect: (offset: number) => void;
  pastCount?: number;
  futureCount?: number;
  className?: string;
}

function buildMonths(pastCount: number, futureCount: number): MonthOption[] {
  const base = new Date();
  const months: MonthOption[] = [];
  for (let i = -pastCount; i <= futureCount; i++) {
    const date = addMonths(base, i);
    months.push({
      offset: i,
      label: format(date, 'MMM/yy', { locale: ptBR }).toUpperCase(),
      monthName: format(date, 'MMMM', { locale: ptBR }),
      year: date.getFullYear(),
      month: date.getMonth() + 1,
    });
  }
  return months;
}

export function MonthCarousel({
  value,
  onSelect,
  pastCount = 12,
  futureCount = 12,
  className,
}: MonthCarouselProps): JSX.Element {
  const months = useMemo<MonthOption[]>(() => buildMonths(pastCount, futureCount), [pastCount, futureCount]);
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const targetIndex = months.findIndex(m => m.offset === value);
    const active = itemRefs.current[targetIndex];
    if (active && typeof active.scrollIntoView === 'function') {
      active.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [value, months]);

  const focusOffset = useCallback(
    (offset: number): void => {
      const targetIndex = months.findIndex(m => m.offset === offset);
      const clamped = Math.max(0, Math.min(months.length - 1, targetIndex));
      const target = itemRefs.current[clamped];
      if (target) {
        target.focus();
      }
    },
    [months]
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
          focusOffset(months[0].offset);
          break;
        case 'End':
          event.preventDefault();
          focusOffset(months[months.length - 1].offset);
          break;
        default:
          break;
      }
    },
    [focusOffset, months, value]
  );

  const handleStep = useCallback(
    (direction: -1 | 1): void => {
      const currentIndex = months.findIndex(m => m.offset === value);
      const nextIndex = Math.max(0, Math.min(months.length - 1, currentIndex + direction));
      onSelect(months[nextIndex].offset);
    },
    [months, onSelect, value]
  );

  const isCurrentMonth = value === 0;
  const currentIndex = months.findIndex(m => m.offset === value);
  const selectedMonthOption = months[currentIndex];

  return (
    <div className={cn('flex flex-col gap-2', className)} data-testid="month-carousel">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Mês anterior"
          onClick={() => handleStep(-1)}
          disabled={currentIndex === 0}
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border',
            'text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:pointer-events-none disabled:opacity-40'
          )}
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
        </button>

        <ul
          ref={listRef}
          role="tablist"
          aria-label="Selecione o mês de referência"
          onKeyDown={handleKeyDown}
          className={cn(
            'flex flex-1 gap-2 overflow-x-auto scroll-smooth pb-1',
            'snap-x snap-mandatory scrollbar-hide'
          )}
        >
          {months.map((option, index) => {
            const isActive = option.offset === value;

            return (
              <li key={option.offset} className="snap-center">
                <button
                  ref={(node) => {
                    itemRefs.current[index] = node;
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
                      : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <span className="text-xs font-bold leading-tight">
                    {option.label}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] leading-tight',
                      isActive ? 'text-primary-foreground/80' : 'text-muted-foreground/70'
                    )}
                  >
                    {option.year}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          aria-label="Próximo mês"
          onClick={() => handleStep(1)}
          disabled={currentIndex === months.length - 1}
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border',
            'text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:pointer-events-none disabled:opacity-40'
          )}
        >
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {selectedMonthOption?.monthName} de {selectedMonthOption?.year}
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
              : 'text-foreground hover:bg-muted'
          )}
        >
          <CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />
          Mês atual
        </button>
      </div>
    </div>
  );
}
