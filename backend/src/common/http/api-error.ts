import { HttpException, type HttpStatus } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

// Descreve o corpo de erro no Swagger, para a documentação mostrar o mesmo
// contrato que o filtro global devolve.
export class ApiErrorEntity implements ApiErrorBody {
  @ApiProperty({ example: 409 })
  statusCode!: number;

  @ApiProperty({ example: 'Conflict', description: 'Rótulo do status HTTP.' })
  error!: string;

  @ApiProperty({
    example: 'Já existe uma empresa cadastrada com o CNPJ 11.222.333/0001-81.',
  })
  message!: string;

  @ApiPropertyOptional({
    example: { cnpj: 'Este CNPJ já está cadastrado.' },
    description:
      'Mensagem por campo, presente quando o erro puder ser atribuído a ' +
      'campos do formulário.',
  })
  fields?: Record<string, string>;

  @ApiProperty({ example: '/companies' })
  path!: string;

  @ApiProperty({ example: '2026-08-31T22:49:33.845Z' })
  timestamp!: string;
}
