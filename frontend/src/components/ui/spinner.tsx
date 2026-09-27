/**
 * spinner.tsx — Indicador de carregamento reutilizável (TAREFA 15).
 *
 * Componente leve baseado em SVG + animação Tailwind (`animate-spin`), usado
 * para sinalizar operações assíncronas (criação/edição/exclusão de despesas)
 * e evitar a percepção de "congelamento" durante a comunicação com a API.
 *
 * Acessibilidade: expõe `role="status"` e um rótulo textual (sr-only) para
 * leitores de tela. Quando `label` é omitido, usa um texto genérico.
 *
 * REGRA (§8.1): proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/cn';

interface SpinnerProps {
  /** Classes adicionais (ex: tamanho/cores). */
  className?: string;
  /** Rótulo acessível anunciado por leitores de tela. */
  label?: string;
  /** Tamanho do ícone em pixels (largura = altura). Padrão: 16. */
  size?: number;
}

/**
 * Indicador de carregamento acessível.
 *
 * @example
 * <Spinner label="Salvando despesa…" />
 */
export function Spinner({
  className,
  label = 'Carregando…',
  size = 16,
}: SpinnerProps): JSX.Element {
  return (
    <span role="status" aria-live="polite" className="inline-flex">
      <Loader2
        aria-hidden="true"
        className={cn('animate-spin', className)}
        style={{ width: size, height: size }}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
