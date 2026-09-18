import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

import { isValidCpf } from '../utils/cpf.util';

/**
 * @IsCpf() — valida se o valor é um CPF brasileiro válido (RN-02).
 * Aceita CPF com ou sem máscara; a normalização ocorre no service.
 */
export function IsCpf(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isCpf',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && isValidCpf(value);
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} deve ser um CPF válido.`;
        },
      },
    });
  };
}
