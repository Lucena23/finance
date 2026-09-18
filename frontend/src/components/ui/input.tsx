/**
 * input.tsx — Componente primitivo de campo de texto (Shadcn/UI style).
 *
 * Encapsula o <input> nativo com estilos consistentes e suporte a estado
 * de erro (aria-invalid). Totalmente tipado — sem uso de `any` (§8.1).
 */

import { forwardRef, type InputHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

/**
 * Campo de entrada de texto acessível e estilizado.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          'border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          'aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive',
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';
