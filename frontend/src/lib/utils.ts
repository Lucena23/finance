/**
 * utils.ts 鈥?Utilit谩rios de apresenta莽茫o do frontend Finan莽as Aksurim.
 *
 * REGRA INEGOCI脕VEL (搂8.2): toda convers茫o de valores monet谩rios de centavos
 * (Int) para formato de exibi莽茫o ocorre EXCLUSIVAMENTE aqui, na camada de
 * apresenta莽茫o. O restante da aplica莽茫o trafega e armazena inteiros.
 */

import { DEFAULT_LOCALE, DEFAULT_TIMEZONE } from './constants';

/**
 * Formata um valor monet谩rio em centavos (Int) para a representa莽茫o
 * brasileira "R$ X.XXX,XX".
 *
 * @param centavos Valor inteiro em centavos (ex: 15075 鈫?"R$ 150,75").
 * @returns String formatada em pt-BR com s铆mbolo da moeda.
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
 * Converte uma string de entrada do usu谩rio (ex: "150,75" ou "150.75")
 * para o inteiro em centavos correspondente (ex: 15075).
 *
 * Utiliza arredondamento para evitar erros de ponto flutuante na convers茫o.
 *
 * @param input Valor textual digitado pelo usu谩rio.
 * @returns Inteiro em centavos, ou 0 se a entrada for inv谩lida.
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
 * Gera as iniciais do usu谩rio a partir do nome completo (搂8.8).
 *
 * - 1 palavra: primeiras 2 letras em mai煤sculo (ex: "Jo茫o" 鈫?"JO").
 * - 2+ palavras: primeira letra das 2 primeiras palavras (ex: "Maria Silva" 鈫?"MS").
 *
 * @param name Nome completo do usu谩rio.
 * @returns Iniciais em mai煤sculo (m谩ximo 2 caracteres).
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
 * Formata uma data ISO 8601 para o padr茫o brasileiro "DD/MM/AAAA".
 *
 * @param isoDate Data em formato ISO 8601 (ex: "2026-09-17T00:00:00.000Z").
 * @returns Data formatada em pt-BR, ou string vazia se inv谩lida.
 */
export function formatDate(isoDate: string | Date): string {
  const date = isoDate instanceof Date ? isoDate : new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  let timeZone = DEFAULT_TIMEZONE;
  if (typeof isoDate === 'string' && isoDate.endsWith('T00:00:00.000Z')) {
    timeZone = 'UTC';
  }

  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone,
  }).format(date);
}

/**
 * Formata uma data ISO 8601 para o padr茫o brasileiro com hora "DD/MM/AAAA HH:mm".
 *
 * @param isoDate Data em formato ISO 8601.
 * @returns Data e hora formatadas em pt-BR, ou string vazia se inv谩lida.
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
 * Formata um percentual (0鈥?00) para exibi莽茫o "XX,X%".
 *
 * @param value Valor percentual num茅rico.
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
 * Mascara um CPF para exibi莽茫o parcial segura (***.***.XXX-XX 鈥?搂5.5).
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
