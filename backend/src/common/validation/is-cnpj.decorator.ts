import { registerDecorator, type ValidationOptions } from 'class-validator';
import { isValidCnpj } from './cnpj.js';

export function IsCnpj(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: 'isCnpj',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && isValidCnpj(value),
        defaultMessage: () => 'CNPJ inválido.',
      },
    });
  };
}
