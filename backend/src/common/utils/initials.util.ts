/**
 * Geração de iniciais a partir do nome do usuário (REGRAS §8.8).
 * - 1 palavra: primeiras 2 letras em maiúsculo (ex: "João" → "JO").
 * - 2+ palavras: primeira letra de cada uma das 2 primeiras palavras (ex: "Maria Silva" → "MS").
 */
export function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);

  if (parts.length === 0) {
    return '';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}
