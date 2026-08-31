import { ApiProperty } from '@nestjs/swagger';

// Descreve a resposta no Swagger. Não há campo sensível na empresa, então a
// entidade sai inteira.
export class CompanyEntity {
  @ApiProperty({ example: '3f1c2b9a-4d7e-4a52-9c0b-8e1d6f2a7b34' })
  id!: string;

  @ApiProperty({ example: 'Bruno Transportes LTDA' })
  name!: string;

  @ApiProperty({
    example: '11222333000181',
    description: 'Sem máscara e em maiúsculas. Aceita o formato alfanumérico.',
  })
  cnpj!: string;

  @ApiProperty({ example: 'Bruno Transportes' })
  tradeName!: string;

  @ApiProperty({ example: 'Rod. Anhanguera, km 78 - Campinas/SP' })
  address!: string;

  @ApiProperty({ example: '2026-08-28T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-08-28T12:00:00.000Z' })
  updatedAt!: Date;
}

export class CompanyCreatedEntity extends CompanyEntity {
  @ApiProperty({
    example: true,
    description:
      'Indica se o aviso por e-mail chegou a ser enviado. O cadastro é ' +
      'concluído mesmo quando o envio falha, e nesse caso o valor é false.',
  })
  notificationSent!: boolean;
}
