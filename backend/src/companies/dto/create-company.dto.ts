import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { IsCnpj } from '../../common/validation/is-cnpj.decorator.js';
import { toCanonicalCnpj, trim } from '../../common/validation/transforms.js';

export class CreateCompanyDto {
  @ApiProperty({ example: 'Bruno Transportes LTDA', maxLength: 150 })
  @Transform(trim)
  @IsString({ message: 'Informe a razão social.' })
  @IsNotEmpty({ message: 'Informe a razão social.' })
  @MinLength(2, { message: 'A razão social deve ter ao menos 2 caracteres.' })
  @MaxLength(150, { message: 'A razão social deve ter no máximo 150 caracteres.' })
  name!: string;

  @ApiProperty({
    example: '11.222.333/0001-81',
    description:
      'Aceita os formatos numérico e alfanumérico, com ou sem máscara. ' +
      'É armazenado sem máscara e em maiúsculas, por exemplo 11222333000181 ' +
      'ou 00000000E08G12.',
  })
  @Transform(toCanonicalCnpj)
  @IsCnpj()
  cnpj!: string;

  @ApiProperty({ example: 'Bruno Transportes', maxLength: 150 })
  @Transform(trim)
  @IsString({ message: 'Informe o nome fantasia.' })
  @IsNotEmpty({ message: 'Informe o nome fantasia.' })
  @MinLength(2, { message: 'O nome fantasia deve ter ao menos 2 caracteres.' })
  @MaxLength(150, { message: 'O nome fantasia deve ter no máximo 150 caracteres.' })
  tradeName!: string;

  @ApiProperty({ example: 'Rod. Anhanguera, km 78 - Campinas/SP', maxLength: 255 })
  @Transform(trim)
  @IsString({ message: 'Informe o endereço.' })
  @IsNotEmpty({ message: 'Informe o endereço.' })
  @MinLength(5, { message: 'O endereço deve ter ao menos 5 caracteres.' })
  @MaxLength(255, { message: 'O endereço deve ter no máximo 255 caracteres.' })
  address!: string;
}
