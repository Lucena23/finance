/**
 * MemberBadge.tsx — Badge colorido com as iniciais de um membro da família
 * (RN-08 / §8.8 — TAREFA 13).
 *
 * Exibe um círculo compacto com as iniciais do membro sobre a cor de avatar
 * (`avatarColor`, hex #RRGGBB) definida no cadastro. Usado para identificar
 * imediatamente quem quitou um compromisso, tanto na fila quanto no histórico.
 *
 * O contraste do texto é calculado dinamicamente a partir da luminância da
 * cor de fundo, garantindo legibilidade sobre qualquer `avatarColor`.
 *
 * REGRA (§8.1): proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import { cn } from '@/lib/cn';

interface MemberBadgeProps {
  /** Iniciais do membro (ex: "MS"). */
  initials: string;
  /** Cor de avatar em hexadecimal (#RRGGBB). */
  avatarColor: string;
  /** Rótulo acessível opcional (ex: nome completo do membro). */
  label?: string;
  /** Tamanho do badge. Padrão: "sm". */
  size?: 'xs' | 'sm' | 'md';
  /** Classe adicional opcional. */
  className?: string;
}

/**
 * Calcula a cor de texto (preto ou branco) com melhor contraste sobre a cor
 * de fundo informada, usando a luminância relativa (WCAG).
 *
 * @param hex Cor de fundo em hexadecimal (#RRGGBB).
 * @returns Classe Tailwind de cor de texto ("text-black" ou "text-white").
 */
function contrastTextClass(hex: string): string {
  const normalized = hex.replace('#', '');

  if (normalized.length !== 6) {
    return 'text-white';
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);

  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return 'text-white';
  }

  // Luminância relativa (sRGB) — limiar 0.6 favorece texto escuro em cores claras.
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.6 ? 'text-black' : 'text-white';
}

/**
 * Tamanhos suportados pelo badge.
 */
const SIZE_CLASS: Record<NonNullable<MemberBadgeProps['size']>, string> = {
  xs: 'h-5 w-5 text-[9px]',
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
};

/**
 * Badge circular com as iniciais do membro sobre a cor de avatar.
 */
export function MemberBadge({
  initials,
  avatarColor,
  label,
  size = 'sm',
  className,
}: MemberBadgeProps): JSX.Element {
  return (
    <span
      role="img"
      aria-label={label ?? `Membro ${initials}`}
      title={label ?? initials}
      data-testid="member-badge"
      style={{ backgroundColor: avatarColor }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-bold uppercase leading-none',
        SIZE_CLASS[size],
        contrastTextClass(avatarColor),
        className,
      )}
    >
      {initials}
    </span>
  );
}
