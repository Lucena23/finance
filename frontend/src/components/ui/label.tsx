/**
 * label.tsx — Componente primitivo de rótulo de formulário.
 *
 * Associa-se ao campo via htmlFor e aplica estilos consistentes.
 * Totalmente tipado — sem uso de `any` (§8.1).
 */

import { forwardRef, type LabelHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

/**
 * Rótulo acessível para campos de formulário.
 */
export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          className,
        )}
        {...props}
      />
    );
  },
);

Label.displayName = 'Label';
