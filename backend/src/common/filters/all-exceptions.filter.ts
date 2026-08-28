import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ApiErrorBody } from '../http/api-error.js';

interface NestExceptionShape {
  message?: string | string[];
  fields?: Record<string, string>;
  error?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const body = this.toApiError(exception, request.url);

    // erro nao previsto e problema nosso: registra o stack inteiro no log,
    // mas devolve uma mensagem generica pra nao vazar detalhe interno.
    if (body.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} falhou`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(body.statusCode).json(body);
  }

  private toApiError(exception: unknown, path: string): ApiErrorBody {
    const timestamp = new Date().toISOString();

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'string') {
        return {
          statusCode,
          error: this.labelFor(statusCode),
          message: response,
          path,
          timestamp,
        };
      }

      const { message, fields } = response as NestExceptionShape;

      return {
        statusCode,
        error: this.labelFor(statusCode),
        // o nest devolve array quando a excecao vem sem payload proprio
        message: Array.isArray(message)
          ? message.join(' ')
          : (message ?? this.labelFor(statusCode)),
        ...(fields ? { fields } : {}),
        path,
        timestamp,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: this.labelFor(HttpStatus.INTERNAL_SERVER_ERROR),
      message: 'Erro inesperado. Tente novamente em instantes.',
      path,
      timestamp,
    };
  }

  // "error" e o rotulo tecnico do status, entao fica em ingles como manda o http.
  // o texto que a pessoa le e o "message", esse sim em pt-br.
  private labelFor(statusCode: number): string {
    const name = HttpStatus[statusCode] as string | undefined;

    if (!name) {
      return 'Error';
    }

    return name
      .toLowerCase()
      .split('_')
      .map((word) => word[0].toUpperCase() + word.slice(1))
      .join(' ');
  }
}
