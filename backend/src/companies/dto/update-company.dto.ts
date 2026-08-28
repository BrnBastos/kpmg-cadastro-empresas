import { PartialType } from '@nestjs/swagger';
import { CreateCompanyDto } from './create-company.dto.js';

// o PartialType do swagger, e nao o do mapped-types, pra nao perder os @ApiProperty
export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {}
