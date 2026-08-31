import { HttpException, type HttpStatus } from '@nestjs/common';

// Formato único de erro da API. O "fields" é o que permite ao formulário
// colocar cada mensagem no input a que ela pertence.
export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
  fields?: Record<string, string>;
  path: string;
  timestamp: string;
}

export interface ApiExceptionPayload {
  message: string;
  fields?: Record<string, string>;
}

export class ApiException extends HttpException {
  constructor(status: HttpStatus, payload: ApiExceptionPayload) {
    super(payload, status);
  }
}
