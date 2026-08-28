import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { IsCnpj } from '../../common/validation/is-cnpj.decorator.js';
import { stripCnpjMask, trim } from '../../common/validation/transforms.js';

export class CreateCompanyDto {
  @ApiProperty({ example: 'Padaria Bom Dia LTDA', maxLength: 150 })
  @Transform(trim)
  @IsString({ message: 'Informe a razão social.' })
  @IsNotEmpty({ message: 'Informe a razão social.' })
  @MinLength(2, { message: 'A razão social deve ter ao menos 2 caracteres.' })
  @MaxLength(150, { message: 'A razão social deve ter no máximo 150 caracteres.' })
  name!: string;

  @ApiProperty({
    example: '11.222.333/0001-81',
    description: 'Aceita com ou sem máscara. É armazenado apenas com dígitos.',
  })
  @Transform(stripCnpjMask)
  @IsCnpj()
  cnpj!: string;

  @ApiProperty({ example: 'Padaria Bom Dia', maxLength: 150 })
  @Transform(trim)
  @IsString({ message: 'Informe o nome fantasia.' })
  @IsNotEmpty({ message: 'Informe o nome fantasia.' })
  @MinLength(2, { message: 'O nome fantasia deve ter ao menos 2 caracteres.' })
  @MaxLength(150, { message: 'O nome fantasia deve ter no máximo 150 caracteres.' })
  tradeName!: string;

  @ApiProperty({ example: 'Rua das Flores, 123 - Centro, São Paulo/SP', maxLength: 255 })
  @Transform(trim)
  @IsString({ message: 'Informe o endereço.' })
  @IsNotEmpty({ message: 'Informe o endereço.' })
  @MinLength(5, { message: 'O endereço deve ter ao menos 5 caracteres.' })
  @MaxLength(255, { message: 'O endereço deve ter no máximo 255 caracteres.' })
  address!: string;
}
