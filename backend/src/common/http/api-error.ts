import { HttpException, type HttpStatus } from '@nestjs/common';

// formato unico de erro da api. o front tem um so contrato pra tratar,
// e o "fields" e o que permite colar a mensagem no input certo do formulario.
export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
  fields?: Record<string, string>;
  path: string;
  timestamp: string;
}

// o que as excecoes carregam. o filtro completa com path e timestamp.
export interface ApiExceptionPayload {
  message: string;
  fields?: Record<string, string>;
}

export class ApiException extends HttpException {
  constructor(status: HttpStatus, payload: ApiExceptionPayload) {
    super(payload, status);
  }
}
