import { BadRequestException, type ValidationError } from '@nestjs/common';
import type { ApiExceptionPayload } from '../http/api-error.js';

// pega o primeiro erro de cada campo. o formulario mostra uma mensagem por input,
// entao devolver a lista inteira so daria trabalho pro front sem ganho nenhum.
function collectFieldErrors(errors: ValidationError[]): Record<string, string> {
  const fields: Record<string, string> = {};

  for (const error of errors) {
    const [firstMessage] = Object.values(error.constraints ?? {});

    if (firstMessage && !fields[error.property]) {
      fields[error.property] = firstMessage;
    }
  }

  return fields;
}

// substitui o erro padrao do ValidationPipe, que devolve um array solto de strings
// sem dizer de qual campo cada mensagem veio.
export function validationExceptionFactory(
  errors: ValidationError[],
): BadRequestException {
  const payload: ApiExceptionPayload = {
    message: 'Alguns campos precisam ser corrigidos.',
    fields: collectFieldErrors(errors),
  };

  return new BadRequestException(payload);
}
