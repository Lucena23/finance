/**
 * validators.ts — Validadores de formulário do frontend Finanças Aksurim.
 *
 * Centraliza as regras de validação client-side utilizadas nas telas de
 * autenticação (TAREFA 36). A validação definitiva permanece no backend
 * (class-validator); aqui garantimos feedback imediato ao usuário.
 *
 * REGRA (§8.1): proibido o uso de `any`. Todos os retornos são tipados.
 */

/**
 * Resultado de uma validação de campo: mensagem de erro ou null se válido.
 */
export type ValidationError = string | null;

/**
 * Remove todos os caracteres não numéricos de uma string.
 *
 * @param value Texto de entrada.
 * @returns Apenas os dígitos contidos na entrada.
 */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Aplica a máscara de CPF "XXX.XXX.XXX-XX" progressivamente durante a digitação.
 *
 * @param value Texto digitado pelo usuário (com ou sem máscara).
 * @returns CPF formatado parcial ou totalmente.
 */
export function formatCpfInput(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  }

  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/**
 * Valida um CPF segundo o algoritmo oficial dos dígitos verificadores.
 *
 * @param cpf CPF com ou sem máscara.
 * @returns true se o CPF for estruturalmente válido.
 */
export function isValidCpf(cpf: string): boolean {
  const digits = onlyDigits(cpf);

  if (digits.length !== 11) {
    return false;
  }

  // Rejeita sequências repetidas (ex: 111.111.111-11).
  if (/^(\d)\1{10}$/.test(digits)) {
    return false;
  }

  const calcCheckDigit = (sliceLength: number): number => {
    let sum = 0;

    for (let i = 0; i < sliceLength; i += 1) {
      sum += Number(digits.charAt(i)) * (sliceLength + 1 - i);
    }

    const remainder = (sum * 10) % 11;

    return remainder === 10 ? 0 : remainder;
  };

  const firstCheck = calcCheckDigit(9);
  const secondCheck = calcCheckDigit(10);

  return (
    firstCheck === Number(digits.charAt(9)) &&
    secondCheck === Number(digits.charAt(10))
  );
}

/**
 * Valida o formato de e-mail (verificação pragmática client-side).
 *
 * @param email Endereço de e-mail.
 * @returns true se o formato for aceitável.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Valida a senha conforme a regra do backend (mínimo 8 caracteres — §3.2).
 *
 * @param password Senha em texto plano.
 * @returns true se atender ao comprimento mínimo.
 */
export function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

/**
 * Valida um campo obrigatório não vazio.
 *
 * @param value Texto de entrada.
 * @returns true se houver conteúdo após trim.
 */
export function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}
