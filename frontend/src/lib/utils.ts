/**
 * utils.ts — Utilitários de apresentação do frontend Finanças Aksurim.
 *
 * REGRA INEGOCIÁVEL (§8.2): toda conversão de valores monetários de centavos
 * (Int) para formato de exibição ocorre EXCLUSIVAMENTE aqui, na camada de
 * apresentação. O restante da aplicação trafega e armazena inteiros.
 */

import { DEFAULT_LOCALE, DEFAULT_TIMEZONE } from './constants';

/**
 * Formata um valor monetário em centavos (Int) para a representação
 * brasileira "R$ X.XXX,XX".
 *
 * @param centavos Valor inteiro em centavos (ex: 15075 → "R$ 150,75").
 * @returns String formatada em pt-BR com símbolo da moeda.
 *
 * @example
 * formatCurrency(15075);   // "R$ 150,75"
 * formatCurrency(1);       // "R$ 0,01"
 * formatCurrency(100000);  // "R$ 1.000,00"
 */
export function formatCurrency(centavos: number): string {
  if (!Number.isFinite(centavos)) {
    return 'R$ 0,00';
  }

  const reais = Math.trunc(centavos) / 100;

  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(reais);
}

/**
 * Converte uma string de entrada do usuário (ex: "150,75" ou "150.75")
 * para o inteiro em centavos correspondente (ex: 15075).
 *
 * Utiliza arredondamento para evitar erros de ponto flutuante na conversão.
 *
 * @param input Valor textual digitado pelo usuário.
 * @returns Inteiro em centavos, ou 0 se a entrada for inválida.
 */
export function parseCurrencyToCents(input: string): number {
  if (typeof input !== 'string') {
    return 0;
  }

  const normalized = input
    .trim()
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  const parsed = Number.parseFloat(normalized);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.round(parsed * 100);
}

/**
 * Gera as iniciais do usuário a partir do nome completo (§8.8).
 *
 * - 1 palavra: primeiras 2 letras em maiúsculo (ex: "João" → "JO").
 * - 2+ palavras: primeira letra das 2 primeiras palavras (ex: "Maria Silva" → "MS").
 *
 * @param name Nome completo do usuário.
 * @returns Iniciais em maiúsculo (máximo 2 caracteres).
 */
export function getInitials(name: string): string {
  if (typeof name !== 'string') {
    return '';
  }

  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);

  if (words.length === 0) {
    return '';
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  const first = words[0].charAt(0);
  const second = words[1].charAt(0);

  return `${first}${second}`.toUpperCase();
}

/**
 * Formata uma data ISO 8601 para o padrão brasileiro "DD/MM/AAAA".
 *
 * @param isoDate Data em formato ISO 8601 (ex: "2026-09-17T00:00:00.000Z").
 * @returns Data formatada em pt-BR, ou string vazia se inválida.
 */
export function formatDate(isoDate: string | Date): string {
  const date = isoDate instanceof Date ? isoDate : new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: DEFAULT_TIMEZONE,
  }).format(date);
}

/**
 * Formata uma data ISO 8601 para o padrão brasileiro com hora "DD/MM/AAAA HH:mm".
 *
 * @param isoDate Data em formato ISO 8601.
 * @returns Data e hora formatadas em pt-BR, ou string vazia se inválida.
 */
export function formatDateTime(isoDate: string | Date): string {
  const date = isoDate instanceof Date ? isoDate : new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: DEFAULT_TIMEZONE,
  }).format(date);
}

/**
 * Formata um percentual (0–100) para exibição "XX,X%".
 *
 * @param value Valor percentual numérico.
 * @returns String formatada em pt-BR.
 */
export function formatPercentage(value: number): string {
  if (!Number.isFinite(value)) {
    return '0%';
  }

  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

/**
 * Mascara um CPF para exibição parcial segura (***.***.XXX-XX — §5.5).
 *
 * @param cpf CPF no formato "XXX.XXX.XXX-XX".
 * @returns CPF parcialmente mascarado.
 */
export function maskCpf(cpf: string): string {
  if (typeof cpf !== 'string') {
    return '';
  }

  const digits = cpf.replace(/\D/g, '');

  if (digits.length !== 11) {
    return '***.***.***-**';
  }

  return `***.***.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}
