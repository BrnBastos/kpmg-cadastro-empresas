import type { TransformFnParams } from 'class-transformer';
import { onlyDigits } from './cnpj.js';

// os transforms rodam antes da validacao, entao o que o validator ve ja esta limpo

export function trim({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

// o front manda com mascara, o banco guarda so os numeros
export function stripCnpjMask({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? onlyDigits(value) : value;
}
