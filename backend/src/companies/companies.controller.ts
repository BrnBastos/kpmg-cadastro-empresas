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
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CompaniesService } from './companies.service.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';
import { CompanyEntity } from './entities/company.entity.js';

@ApiTags('Empresas')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Post()
  @ApiOperation({
    summary: 'Cadastra uma empresa e avisa o grupo por e-mail',
  })
  @ApiCreatedResponse({ type: CompanyEntity })
  create(@Body() dto: CreateCompanyDto): Promise<CompanyEntity> {
    return this.companies.create(dto);
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
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<CompanyEntity> {
    return this.companies.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza os dados de uma empresa' })
  @ApiOkResponse({ type: CompanyEntity })
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
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.companies.remove(id);
  }
}
