import { describe, expect, it } from 'vitest';

import {
  formatCurrency,
  formatDate,
  getInitials,
  maskCpf,
  parseCurrencyToCents,
} from './utils';

/**
 * Testes unitários dos utilitários de apresentação (TAREFA 50 — smoke).
 *
 * Valida a conversão de centavos (Int) para exibição (RN-04 / §8.2) e a
 * geração de iniciais do usuário (RN-08 / §8.8).
 */
describe('formatCurrency', () => {
  it('converte centavos (Int) para o formato R$ X.XXX,XX', () => {
    // Normaliza espaços não separáveis para comparação estável.
    const normalize = (value: string): string =>
      value.replace(/\u00a0/g, ' ');

    expect(normalize(formatCurrency(15075))).toBe('R$ 150,75');
    expect(normalize(formatCurrency(1))).toBe('R$ 0,01');
    expect(normalize(formatCurrency(100000))).toBe('R$ 1.000,00');
  });

  it('retorna R$ 0,00 para valores não finitos', () => {
    expect(formatCurrency(Number.NaN)).toBe('R$ 0,00');
  });
});

describe('parseCurrencyToCents', () => {
  it('converte entrada textual em centavos inteiros', () => {
    expect(parseCurrencyToCents('150,75')).toBe(15075);
    expect(parseCurrencyToCents('R$ 1.000,00')).toBe(100000);
    expect(parseCurrencyToCents('0,01')).toBe(1);
  });

  it('retorna 0 para entrada inválida', () => {
    expect(parseCurrencyToCents('abc')).toBe(0);
  });
});

describe('getInitials', () => {
  it('usa as 2 primeiras letras para nome de 1 palavra (§8.8)', () => {
    expect(getInitials('João')).toBe('JO');
  });

  it('usa as iniciais das 2 primeiras palavras para nomes compostos (§8.8)', () => {
    expect(getInitials('Maria Silva')).toBe('MS');
    expect(getInitials('Joannderson Lucena de Souza')).toBe('JL');
  });

  it('retorna string vazia para entrada vazia', () => {
    expect(getInitials('   ')).toBe('');
  });
});

describe('maskCpf', () => {
  it('mascara o CPF preservando apenas os dígitos finais (§5.5)', () => {
    expect(maskCpf('123.456.789-01')).toBe('***.***.789-01');
  });

  it('retorna máscara completa para CPF inválido', () => {
    expect(maskCpf('123')).toBe('***.***.***-**');
  });
});

describe('formatDate', () => {
  it('formata data ISO para o padrão brasileiro DD/MM/AAAA', () => {
    // Meio-dia UTC evita deslocamento de dia no fuso America/Sao_Paulo (UTC-3).
    expect(formatDate('2026-09-17T12:00:00.000Z')).toBe('17/09/2026');
  });

  it('retorna string vazia para data inválida', () => {
    expect(formatDate('data-invalida')).toBe('');
  });
});
