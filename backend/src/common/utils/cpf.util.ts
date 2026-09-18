/**
 * Utilitários de CPF — RN-02 / ARCHITECTURE §5.5.
 *
 * O CPF do titular é armazenado mascarado (XXX.XXX.XXX-XX) e exibido no
 * frontend apenas de forma parcial (***.***.XXX-XX).
 */

/**
 * Remove qualquer caractere não numérico do CPF.
 */
export function stripCpf(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

/**
 * Valida um CPF aplicando o algoritmo oficial dos dígitos verificadores.
 * Rejeita sequências repetidas (ex: 111.111.111-11) e tamanhos inválidos.
 */
export function isValidCpf(cpf: string): boolean {
  const digits = stripCpf(cpf);

  if (digits.length !== 11) {
    return false;
  }

  // Rejeita sequências de dígitos iguais (ex: 000.000.000-00).
  if (/^(\d)\1{10}$/.test(digits)) {
    return false;
  }

  const calcCheckDigit = (base: string): number => {
    let sum = 0;
    for (let i = 0; i < base.length; i += 1) {
      sum += Number(base.charAt(i)) * (base.length + 1 - i);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  const firstCheck = calcCheckDigit(digits.slice(0, 9));
  const secondCheck = calcCheckDigit(digits.slice(0, 10));

  return (
    firstCheck === Number(digits.charAt(9)) &&
    secondCheck === Number(digits.charAt(10))
  );
}

/**
 * Formata um CPF para o padrão mascarado de armazenamento: XXX.XXX.XXX-XX.
 * Lança erro se o CPF não possuir 11 dígitos.
 */
export function formatCpf(cpf: string): string {
  const digits = stripCpf(cpf);

  if (digits.length !== 11) {
    throw new Error('CPF inválido: deve conter 11 dígitos.');
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

/**
 * Gera a exibição parcial do CPF para o frontend: ***.***.XXX-XX.
 * Mantém visíveis apenas os 3 dígitos do meio e os 2 dígitos verificadores.
 */
export function maskCpfForDisplay(cpf: string): string {
  const digits = stripCpf(cpf);

  if (digits.length !== 11) {
    return '***.***.***-**';
  }

  return `***.***.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}
