import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiException } from '../common/http/api-error.js';
import { formatCnpj } from '../common/validation/cnpj.js';
import { Prisma, type Company } from '../generated/prisma/client.js';
import { MailService } from '../mail/mail.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateCompanyDto } from './dto/create-company.dto.js';
import type { UpdateCompanyDto } from './dto/update-company.dto.js';

// codigos do prisma que viram erro de negocio: violacao de unique e registro ausente
const UNIQUE_VIOLATION = 'P2002';
const RECORD_NOT_FOUND = 'P2025';

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async create(dto: CreateCompanyDto): Promise<Company> {
    let company: Company;

    try {
      company = await this.prisma.company.create({ data: dto });
    } catch (error) {
      throw this.translatePrismaError(error, dto.cnpj);
    }

    // chamada direta em vez de evento: e um unico interessado no cadastro, e o
    // MailService ja engole a propria falha, entao nada daqui derruba o 201.
    await this.mail.sendCompanyCreated(company);

    return company;
  }

  findAll(): Promise<Company[]> {
    // mais recentes primeiro: e a ordem que faz sentido numa tela de cadastro
    return this.prisma.company.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string): Promise<Company> {
    const company = await this.prisma.company.findUnique({ where: { id } });

    if (!company) {
      throw this.notFound();
    }

    return company;
  }

  async update(id: string, dto: UpdateCompanyDto): Promise<Company> {
    try {
      return await this.prisma.company.update({ where: { id }, data: dto });
    } catch (error) {
      throw this.translatePrismaError(error, dto.cnpj);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.company.delete({ where: { id } });
    } catch (error) {
      throw this.translatePrismaError(error);
    }
  }

  // nao existe consulta de "ja existe esse cnpj" antes de gravar de proposito:
  // entre o select e o insert cabe outra requisicao gravando o mesmo cnpj.
  // quem garante a unicidade e o indice do banco, e o P2002 e a resposta dele.
  private translatePrismaError(error: unknown, cnpj?: string): unknown {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return error;
    }

    if (error.code === UNIQUE_VIOLATION) {
      const formatted = cnpj ? ` ${formatCnpj(cnpj)}` : '';

      return new ApiException(HttpStatus.CONFLICT, {
        message: `Já existe uma empresa cadastrada com o CNPJ${formatted}.`,
        // o front usa isso pra destacar o campo em vez de mostrar um alerta solto
        fields: { cnpj: 'Este CNPJ já está cadastrado.' },
      });
    }

    if (error.code === RECORD_NOT_FOUND) {
      return this.notFound();
    }

    return error;
  }

  private notFound(): ApiException {
    return new ApiException(HttpStatus.NOT_FOUND, {
      message: 'Empresa não encontrada.',
    });
  }
}
