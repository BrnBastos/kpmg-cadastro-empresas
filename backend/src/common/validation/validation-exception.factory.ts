import { BadRequestException, type ValidationError } from '@nestjs/common';
import type { ApiExceptionPayload } from '../http/api-error.js';

// Chave usada pelo class-validator quando o whitelist barra um campo.
const UNKNOWN_PROPERTY = 'whitelistValidation';

function isUnknownProperty(error: ValidationError): boolean {
  return Object.keys(error.constraints ?? {}).includes(UNKNOWN_PROPERTY);
}

// Um erro por campo: o formulário mostra uma mensagem por input.
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

export function validationExceptionFactory(
  errors: ValidationError[],
): BadRequestException {
  const unknown = errors.filter(isUnknownProperty);

  // Campo inexistente é erro de quem chamou a API, não do formulário: não há
  // input para destacar, e o texto padrão do class-validator vem em inglês.
  if (unknown.length > 0) {
    const names = unknown.map((error) => error.property).join(', ');

    return new BadRequestException({
      message: `A requisição enviou campos que não existem: ${names}.`,
    } satisfies ApiExceptionPayload);
  }

  return new BadRequestException({
    message: 'Alguns campos precisam ser corrigidos.',
    fields: collectFieldErrors(errors),
  } satisfies ApiExceptionPayload);
}
