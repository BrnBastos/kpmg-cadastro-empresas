import { HttpStatus, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ApiException } from '../common/http/api-error.js';
import { Prisma, type Company } from '../generated/prisma/client.js';
import { MailService } from '../mail/mail.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CompaniesService } from './companies.service.js';
import type { CreateCompanyDto } from './dto/create-company.dto.js';

const CLIENT_VERSION = '7.10.0';

function prismaError(code: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(`erro ${code}`, {
    code,
    clientVersion: CLIENT_VERSION,
  });
}

function companyFixture(overrides: Partial<Company> = {}): Company {
  return {
    id: '3f1c2b9a-4d7e-4a52-9c0b-8e1d6f2a7b34',
    name: 'Padaria Bom Dia LTDA',
    cnpj: '11222333000181',
    tradeName: 'Padaria Bom Dia',
    address: 'Rua das Flores, 123 - Centro',
    createdAt: new Date('2026-08-28T15:00:00.000Z'),
    updatedAt: new Date('2026-08-28T15:00:00.000Z'),
    ...overrides,
  };
}

const createDto: CreateCompanyDto = {
  name: 'Padaria Bom Dia LTDA',
  cnpj: '11222333000181',
  tradeName: 'Padaria Bom Dia',
  address: 'Rua das Flores, 123 - Centro',
};

describe('CompaniesService', () => {
  let service: CompaniesService;
  let prisma: {
    company: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
  };
  let mail: { sendCompanyCreated: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    prisma = {
      company: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };
    mail = { sendCompanyCreated: vi.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CompaniesService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mail },
      ],
    }).compile();

    service = moduleRef.get(CompaniesService);
  });

  describe('create', () => {
    it('grava a empresa e devolve o registro criado', async () => {
      const company = companyFixture();
      prisma.company.create.mockResolvedValue(company);

      await expect(service.create(createDto)).resolves.toEqual(company);
      expect(prisma.company.create).toHaveBeenCalledWith({ data: createDto });
    });

    it('avisa por e-mail com a empresa que acabou de ser gravada', async () => {
      const company = companyFixture();
      prisma.company.create.mockResolvedValue(company);

      await service.create(createDto);

      expect(mail.sendCompanyCreated).toHaveBeenCalledTimes(1);
      // o aviso leva o registro do banco, com id e datas, e nao o dto cru
      expect(mail.sendCompanyCreated).toHaveBeenCalledWith(company);
    });

    // o cadastro ja esta gravado quando o e-mail sai. se o smtp estiver fora,
    // a resposta continua sendo sucesso.
    it('conclui o cadastro mesmo quando o envio do e-mail falha', async () => {
      const company = companyFixture();
      const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
      prisma.company.create.mockResolvedValue(company);
      mail.sendCompanyCreated.mockRejectedValue(new Error('smtp fora do ar'));

      await expect(service.create(createDto)).resolves.toEqual(company);
      expect(logged).toHaveBeenCalledOnce();

      logged.mockRestore();
    });

    it('transforma cnpj duplicado em 409 apontando o campo', async () => {
      prisma.company.create.mockRejectedValue(prismaError('P2002'));

      const error = await service.create(createDto).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ApiException);
      expect((error as ApiException).getStatus()).toBe(HttpStatus.CONFLICT);
      expect((error as ApiException).getResponse()).toMatchObject({
        fields: { cnpj: expect.stringContaining('cadastrado') },
      });
    });

    it('nao dispara e-mail quando a gravacao falha', async () => {
      prisma.company.create.mockRejectedValue(prismaError('P2002'));

      await service.create(createDto).catch(() => undefined);

      expect(mail.sendCompanyCreated).not.toHaveBeenCalled();
    });

    it('deixa passar erro que nao e do prisma', async () => {
      prisma.company.create.mockRejectedValue(new Error('conexao perdida'));

      await expect(service.create(createDto)).rejects.toThrow('conexao perdida');
    });
  });

  describe('findAll', () => {
    it('lista da mais recente para a mais antiga', async () => {
      const companies = [companyFixture()];
      prisma.company.findMany.mockResolvedValue(companies);

      await expect(service.findAll()).resolves.toEqual(companies);
      expect(prisma.company.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('devolve a empresa encontrada', async () => {
      const company = companyFixture();
      prisma.company.findUnique.mockResolvedValue(company);

      await expect(service.findOne(company.id)).resolves.toEqual(company);
    });

    it('da 404 quando o id nao existe', async () => {
      prisma.company.findUnique.mockResolvedValue(null);

      const error = await service.findOne('sem-id').catch((e: unknown) => e);

      expect((error as ApiException).getStatus()).toBe(HttpStatus.NOT_FOUND);
    });
  });

  describe('update', () => {
    it('atualiza somente os campos enviados', async () => {
      const company = companyFixture({ tradeName: 'Padaria 24h' });
      prisma.company.update.mockResolvedValue(company);

      await expect(
        service.update(company.id, { tradeName: 'Padaria 24h' }),
      ).resolves.toEqual(company);
      expect(prisma.company.update).toHaveBeenCalledWith({
        where: { id: company.id },
        data: { tradeName: 'Padaria 24h' },
      });
    });

    it('da 404 quando o registro nao existe', async () => {
      prisma.company.update.mockRejectedValue(prismaError('P2025'));

      const error = await service
        .update('sem-id', { tradeName: 'x' })
        .catch((e: unknown) => e);

      expect((error as ApiException).getStatus()).toBe(HttpStatus.NOT_FOUND);
    });

    it('da 409 ao mudar para um cnpj que ja existe', async () => {
      prisma.company.update.mockRejectedValue(prismaError('P2002'));

      const error = await service
        .update('id', { cnpj: '11222333000181' })
        .catch((e: unknown) => e);

      expect((error as ApiException).getStatus()).toBe(HttpStatus.CONFLICT);
    });

    // atualizar nao e cadastrar: o aviso e so do cadastro
    it('nao dispara e-mail na atualizacao', async () => {
      prisma.company.update.mockResolvedValue(companyFixture());

      await service.update('id', { tradeName: 'x' });

      expect(mail.sendCompanyCreated).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('remove pelo id', async () => {
      prisma.company.delete.mockResolvedValue(companyFixture());

      await expect(service.remove('id')).resolves.toBeUndefined();
      expect(prisma.company.delete).toHaveBeenCalledWith({
        where: { id: 'id' },
      });
    });

    it('da 404 ao remover algo que nao existe', async () => {
      prisma.company.delete.mockRejectedValue(prismaError('P2025'));

      const error = await service.remove('sem-id').catch((e: unknown) => e);

      expect((error as ApiException).getStatus()).toBe(HttpStatus.NOT_FOUND);
    });
  });
});
