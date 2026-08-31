import type { TransformFnParams } from 'class-transformer';
import { normalizeCnpj } from './cnpj.js';

export function trim({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

// Quando o valor é reconhecível, guarda a forma canônica. Quando não é, devolve
// o original para o validador recusá-lo em vez de gravar algo transformado.
export function toCanonicalCnpj({ value }: TransformFnParams): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  return normalizeCnpj(value) ?? value.trim();
}
