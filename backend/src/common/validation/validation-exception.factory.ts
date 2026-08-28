import { BadRequestException, type ValidationError } from '@nestjs/common';
import type { ApiExceptionPayload } from '../http/api-error.js';

// chave que o class-validator usa quando o whitelist barra um campo desconhecido
const UNKNOWN_PROPERTY = 'whitelistValidation';

function isUnknownProperty(error: ValidationError): boolean {
  return Object.keys(error.constraints ?? {}).includes(UNKNOWN_PROPERTY);
}

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
  const unknown = errors.filter(isUnknownProperty);

  // campo que nao existe no dto e erro de quem chamou a api, nao do formulario.
  // nao entra em "fields" porque nao ha input pra destacar, e a mensagem padrao
  // do class-validator vem em ingles.
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
