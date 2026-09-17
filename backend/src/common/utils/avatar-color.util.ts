/**
 * Paleta de cores de avatar (hex #RRGGBB) — REGRAS §8.8.
 * A cor deve ser única dentro do workspace.
 */
export const AVATAR_COLOR_PALETTE: readonly string[] = [
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#EAB308',
  '#84CC16',
  '#22C55E',
  '#10B981',
  '#14B8A6',
  '#06B6D4',
  '#0EA5E9',
  '#3B82F6',
  '#6366F1',
  '#8B5CF6',
  '#A855F7',
  '#D946EF',
  '#EC4899',
];

/**
 * Seleciona uma cor de avatar ainda não utilizada dentro do workspace.
 * Caso todas as cores da paleta estejam em uso, gera uma cor determinística
 * a partir do índice informado.
 */
export function pickAvatarColor(usedColors: readonly string[]): string {
  const used = new Set(usedColors.map((color) => color.toUpperCase()));

  const available = AVATAR_COLOR_PALETTE.find(
    (color) => !used.has(color.toUpperCase()),
  );

  if (available) {
    return available;
  }

  // Fallback determinístico: gera um hex pseudo-aleatório estável.
  const seed = usedColors.length;
  const value = (seed * 2654435761) % 0xffffff;
  return `#${value.toString(16).padStart(6, '0').toUpperCase()}`;
}
