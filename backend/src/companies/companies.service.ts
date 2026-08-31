import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ApiException } from '../common/http/api-error.js';
import { formatCnpj } from '../common/validation/cnpj.js';
import { Prisma, type Company } from '../generated/prisma/client.js';
import { MailService } from '../mail/mail.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateCompanyDto } from './dto/create-company.dto.js';
import type { UpdateCompanyDto } from './dto/update-company.dto.js';

const UNIQUE_VIOLATION = 'P2002';
const RECORD_NOT_FOUND = 'P2025';

export interface CompanyCreationResult {
  company: Company;
  /** O envio é síncrono e best-effort: falhar aqui não invalida o cadastro. */
  notificationSent: boolean;
}

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async create(dto: CreateCompanyDto): Promise<CompanyCreationResult> {
    let company: Company;

    try {
      company = await this.prisma.company.create({ data: dto });
    } catch (error) {
      throw this.translatePrismaError(error, dto.cnpj);
    }

    return { company, notificationSent: await this.notifyCreation(company) };
  }

  // A empresa já está gravada quando o aviso sai, então uma falha de SMTP não
  // pode derrubar o cadastro. O resultado sobe junto para que a tela informe o
  // que de fato aconteceu, em vez de afirmar que o e-mail foi enviado.
  private async notifyCreation(company: Company): Promise<boolean> {
    try {
      await this.mail.sendCompanyCreated(company);

      return true;
    } catch (error) {
      this.logger.error(
        `Empresa ${company.id} cadastrada, mas o aviso por e-mail falhou`,
        error instanceof Error ? error.stack : String(error),
      );

      return false;
    }
  }

  findAll(): Promise<Company[]> {
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
    // Um PATCH sem campos costuma ser erro de quem chamou. Recusar é mais útil
    // do que devolver o registro intacto como se algo tivesse mudado.
    if (Object.keys(dto).length === 0) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        message: 'Informe ao menos um campo para atualizar.',
      });
    }

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

  // Não há consulta de "esse CNPJ já existe" antes de gravar: entre o SELECT e o
  // INSERT cabe outra requisição com o mesmo CNPJ. Quem garante a unicidade é o
  // índice do banco, e o P2002 é a resposta dele.
  private translatePrismaError(error: unknown, cnpj?: string): unknown {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return error;
    }

    if (error.code === UNIQUE_VIOLATION) {
      const formatted = cnpj ? ` ${formatCnpj(cnpj)}` : '';

      return new ApiException(HttpStatus.CONFLICT, {
        message: `Já existe uma empresa cadastrada com o CNPJ${formatted}.`,
        // O formulário usa isto para destacar o campo.
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
