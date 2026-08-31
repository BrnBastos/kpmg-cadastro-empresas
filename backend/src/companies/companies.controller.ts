import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrorEntity } from '../common/http/api-error.js';
import { CompaniesService } from './companies.service.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';
import {
  CompanyCreatedEntity,
  CompanyEntity,
} from './entities/company.entity.js';

@ApiTags('Empresas')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Post()
  @ApiOperation({
    summary: 'Cadastra uma empresa e avisa o grupo por e-mail',
    description:
      'O aviso é enviado de forma síncrona e best-effort. Se o SMTP falhar, a ' +
      'empresa continua cadastrada e a resposta traz notificationSent: false.',
  })
  @ApiCreatedResponse({ type: CompanyCreatedEntity })
  @ApiBadRequestResponse({ type: ApiErrorEntity, description: 'Corpo inválido.' })
  @ApiConflictResponse({ type: ApiErrorEntity, description: 'CNPJ já cadastrado.' })
  async create(@Body() dto: CreateCompanyDto): Promise<CompanyCreatedEntity> {
    const { company, notificationSent } = await this.companies.create(dto);

    return { ...company, notificationSent };
  }

  @Get()
  @ApiOperation({ summary: 'Lista as empresas, da mais recente para a mais antiga' })
  @ApiOkResponse({ type: [CompanyEntity] })
  findAll(): Promise<CompanyEntity[]> {
    return this.companies.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca uma empresa pelo id' })
  @ApiOkResponse({ type: CompanyEntity })
  @ApiBadRequestResponse({ type: ApiErrorEntity, description: 'Id fora do formato UUID.' })
  @ApiNotFoundResponse({ type: ApiErrorEntity })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<CompanyEntity> {
    return this.companies.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualiza os dados de uma empresa',
    description:
      'Aceita apenas os campos que mudaram. Um corpo vazio é recusado com 400.',
  })
  @ApiOkResponse({ type: CompanyEntity })
  @ApiBadRequestResponse({
    type: ApiErrorEntity,
    description: 'Corpo inválido, corpo vazio ou id fora do formato UUID.',
  })
  @ApiNotFoundResponse({ type: ApiErrorEntity })
  @ApiConflictResponse({ type: ApiErrorEntity, description: 'CNPJ já cadastrado.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyDto,
  ): Promise<CompanyEntity> {
    return this.companies.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove uma empresa' })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({ type: ApiErrorEntity, description: 'Id fora do formato UUID.' })
  @ApiNotFoundResponse({ type: ApiErrorEntity })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.companies.remove(id);
  }
}
