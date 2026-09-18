/**
 * cn.ts — Utilitário de composição de classes CSS.
 *
 * Combina `clsx` (concatenação condicional) com `tailwind-merge`
 * (resolução de conflitos entre classes Tailwind), padrão consagrado
 * do ecossistema Shadcn/UI.
 *
 * @example
 * cn('px-2 py-1', isActive && 'bg-primary', className);
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Mescla classes CSS condicionais resolvendo conflitos do Tailwind.
 *
 * @param inputs Lista de classes (strings, arrays, objetos condicionais).
 * @returns String de classes final, sem duplicidades conflitantes.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
