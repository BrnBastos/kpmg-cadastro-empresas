import { ApiProperty } from '@nestjs/swagger';

// existe pro swagger conseguir descrever a resposta. os dados vem do prisma,
// e como nao ha campo sensivel na empresa, a entidade sai inteira.
export class CompanyEntity {
  @ApiProperty({ example: '3f1c2b9a-4d7e-4a52-9c0b-8e1d6f2a7b34' })
  id!: string;

  @ApiProperty({ example: 'Padaria Bom Dia LTDA' })
  name!: string;

  @ApiProperty({ example: '11222333000181', description: 'Apenas dígitos.' })
  cnpj!: string;

  @ApiProperty({ example: 'Padaria Bom Dia' })
  tradeName!: string;

  @ApiProperty({ example: 'Rua das Flores, 123 - Centro, São Paulo/SP' })
  address!: string;

  @ApiProperty({ example: '2026-08-28T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-08-28T12:00:00.000Z' })
  updatedAt!: Date;
}
