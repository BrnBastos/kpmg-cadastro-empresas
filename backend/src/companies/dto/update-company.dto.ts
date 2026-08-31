import { PartialType } from '@nestjs/swagger';
import { CreateCompanyDto } from './create-company.dto.js';

// PartialType do @nestjs/swagger, e não o de mapped-types, para não perder os
// @ApiProperty na documentação.
export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {}
