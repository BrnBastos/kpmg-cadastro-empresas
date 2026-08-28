import { type INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { MailService } from '../src/mail/mail.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { setupApp } from '../src/setup-app.js';

// dois cnpjs validos de verdade, com os digitos verificadores corretos
const CNPJ = '11.222.333/0001-81';
const CNPJ_DIGITS = '11222333000181';
const OTHER_CNPJ = '11.444.777/0001-61';
const OTHER_CNPJ_DIGITS = '11444777000161';

const payload = {
  name: 'Padaria Bom Dia LTDA',
  cnpj: CNPJ,
  tradeName: 'Padaria Bom Dia',
  address: 'Rua das Flores, 123 - Centro',
};

describe('Empresas (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const sendCompanyCreated = vi.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      // o e2e valida a api, nao o smtp. o envio em si tem teste proprio.
      .overrideProvider(MailService)
      .useValue({ sendCompanyCreated })
      .compile();

    app = setupApp(moduleRef.createNestApplication());
    prisma = app.get(PrismaService);
    await app.init();
  });

  // limpa antes de cada caso, e nao depois: se um teste quebra no meio, o
  // proximo ainda comeca com a tabela vazia.
  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE companies');
    sendCompanyCreated.mockReset();
    sendCompanyCreated.mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  async function createCompany(overrides: Partial<typeof payload> = {}) {
    const response = await http()
      .post('/companies')
      .send({ ...payload, ...overrides })
      .expect(201);

    return response.body as { id: string; [key: string]: unknown };
  }

  describe('POST /companies', () => {
    it('cadastra e devolve a empresa criada', async () => {
      const response = await http().post('/companies').send(payload).expect(201);

      expect(response.body).toMatchObject({
        name: payload.name,
        tradeName: payload.tradeName,
        address: payload.address,
        // entrou com mascara, e guardado so com digitos
        cnpj: CNPJ_DIGITS,
      });
      expect(response.body.id).toEqual(expect.any(String));
      expect(response.body.createdAt).toEqual(expect.any(String));
      expect(response.body.updatedAt).toEqual(expect.any(String));
    });

    it('grava de fato no banco', async () => {
      const created = await createCompany();

      const stored = await prisma.company.findUnique({
        where: { id: created.id },
      });

      expect(stored?.cnpj).toBe(CNPJ_DIGITS);
    });

    it('dispara o aviso por e-mail uma unica vez, com a empresa gravada', async () => {
      const created = await createCompany();

      expect(sendCompanyCreated).toHaveBeenCalledTimes(1);
      expect(sendCompanyCreated).toHaveBeenCalledWith(
        expect.objectContaining({ id: created.id, cnpj: CNPJ_DIGITS }),
      );
    });

    it('responde 201 mesmo se o envio do e-mail falhar', async () => {
      // a falha aqui e proposital, entao o log dela nao precisa sujar a saida
      const logged = vi
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});
      sendCompanyCreated.mockRejectedValue(new Error('smtp fora do ar'));

      const response = await http().post('/companies').send(payload).expect(201);

      expect(logged).toHaveBeenCalledOnce();
      logged.mockRestore();

      // e a empresa continua gravada
      const stored = await prisma.company.findUnique({
        where: { id: response.body.id },
      });
      expect(stored).not.toBeNull();
    });

    it('recusa cnpj com digito verificador errado', async () => {
      const response = await http()
        .post('/companies')
        .send({ ...payload, cnpj: '11.222.333/0001-99' })
        .expect(400);

      expect(response.body.fields).toMatchObject({ cnpj: expect.any(String) });
      expect(sendCompanyCreated).not.toHaveBeenCalled();
    });

    it('recusa campos obrigatorios vazios, apontando cada um', async () => {
      const response = await http()
        .post('/companies')
        .send({ name: '', cnpj: '', tradeName: '', address: '' })
        .expect(400);

      expect(Object.keys(response.body.fields)).toEqual(
        expect.arrayContaining(['name', 'cnpj', 'tradeName', 'address']),
      );
    });

    it('recusa campo que nao existe no cadastro', async () => {
      await http()
        .post('/companies')
        .send({ ...payload, salario: 1000 })
        .expect(400);
    });

    it('recusa cnpj repetido e aponta o campo', async () => {
      await createCompany();

      const response = await http().post('/companies').send(payload).expect(409);

      expect(response.body).toMatchObject({
        statusCode: 409,
        fields: { cnpj: expect.any(String) },
      });
    });

    it('nao envia e-mail quando o cadastro e recusado', async () => {
      await createCompany();
      sendCompanyCreated.mockClear();

      await http().post('/companies').send(payload).expect(409);

      expect(sendCompanyCreated).not.toHaveBeenCalled();
    });
  });

  describe('GET /companies', () => {
    it('devolve lista vazia quando nao ha cadastro', async () => {
      await http().get('/companies').expect(200).expect([]);
    });

    it('lista da mais recente para a mais antiga', async () => {
      await createCompany();
      await createCompany({ cnpj: OTHER_CNPJ, name: 'Mercado Central LTDA' });

      const response = await http().get('/companies').expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].cnpj).toBe(OTHER_CNPJ_DIGITS);
    });
  });

  describe('GET /companies/:id', () => {
    it('devolve a empresa pelo id', async () => {
      const created = await createCompany();

      const response = await http()
        .get(`/companies/${created.id}`)
        .expect(200);

      expect(response.body.id).toBe(created.id);
    });

    it('da 404 para id inexistente', async () => {
      await http()
        .get('/companies/3f1c2b9a-4d7e-4a52-9c0b-8e1d6f2a7b34')
        .expect(404);
    });

    it('da 400 para id que nao e uuid', async () => {
      await http().get('/companies/abc').expect(400);
    });
  });

  describe('PATCH /companies/:id', () => {
    it('atualiza so o campo enviado e move o alterado em', async () => {
      const created = await createCompany();

      const response = await http()
        .patch(`/companies/${created.id}`)
        .send({ tradeName: 'Padaria Bom Dia 24h' })
        .expect(200);

      expect(response.body).toMatchObject({
        tradeName: 'Padaria Bom Dia 24h',
        name: payload.name,
      });
      expect(new Date(response.body.updatedAt).getTime()).toBeGreaterThan(
        new Date(created.createdAt as string).getTime(),
      );
    });

    it('valida o cnpj na atualizacao tambem', async () => {
      const created = await createCompany();

      await http()
        .patch(`/companies/${created.id}`)
        .send({ cnpj: '11.222.333/0001-99' })
        .expect(400);
    });

    it('da 409 ao mudar para um cnpj de outra empresa', async () => {
      const first = await createCompany();
      await createCompany({ cnpj: OTHER_CNPJ, name: 'Mercado Central LTDA' });

      await http()
        .patch(`/companies/${first.id}`)
        .send({ cnpj: OTHER_CNPJ })
        .expect(409);
    });

    it('da 404 para id inexistente', async () => {
      await http()
        .patch('/companies/3f1c2b9a-4d7e-4a52-9c0b-8e1d6f2a7b34')
        .send({ tradeName: 'Qualquer' })
        .expect(404);
    });

    it('nao dispara e-mail: o aviso e so do cadastro', async () => {
      const created = await createCompany();
      sendCompanyCreated.mockClear();

      await http()
        .patch(`/companies/${created.id}`)
        .send({ tradeName: 'Outro nome' })
        .expect(200);

      expect(sendCompanyCreated).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /companies/:id', () => {
    it('remove e some da listagem', async () => {
      const created = await createCompany();

      await http().delete(`/companies/${created.id}`).expect(204);
      await http().get(`/companies/${created.id}`).expect(404);
      await http().get('/companies').expect(200).expect([]);
    });

    it('da 404 ao remover duas vezes', async () => {
      const created = await createCompany();

      await http().delete(`/companies/${created.id}`).expect(204);
      await http().delete(`/companies/${created.id}`).expect(404);
    });
  });

  // o caminho que a tela percorre, do cadastro ate a remocao
  it('percorre o ciclo completo de cadastro, listagem, edicao e exclusao', async () => {
    const created = await createCompany();
    expect(sendCompanyCreated).toHaveBeenCalledTimes(1);

    await http().get('/companies').expect(200).expect((res) => {
      expect(res.body).toHaveLength(1);
    });

    await http()
      .patch(`/companies/${created.id}`)
      .send({ address: 'Av. Paulista, 1000 - Bela Vista' })
      .expect(200);

    await http()
      .get(`/companies/${created.id}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.address).toBe('Av. Paulista, 1000 - Bela Vista');
      });

    await http().delete(`/companies/${created.id}`).expect(204);
    await http().get('/companies').expect(200).expect([]);
  });
});
