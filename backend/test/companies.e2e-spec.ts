import { type INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { MailService } from '../src/mail/mail.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { setupApp } from '../src/setup-app.js';

const CNPJ_MASKED = '11.222.333/0001-81';
const CNPJ = '11222333000181';
const OTHER_CNPJ_MASKED = '11.444.777/0001-61';
const OTHER_CNPJ = '11444777000161';
// Primeiro CNPJ alfanumérico divulgado pela Receita Federal.
const ALPHANUMERIC_MASKED = '00.000.000/E08G-12';
const ALPHANUMERIC = '00000000E08G12';

const payload = {
  name: 'Bruno Transportes LTDA',
  cnpj: CNPJ_MASKED,
  tradeName: 'Bruno Transportes',
  address: 'Rod. Anhanguera, km 78 - Campinas/SP',
};

describe('Empresas (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const sendCompanyCreated = vi.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      // O e2e cobre a integração HTTP + Nest + PostgreSQL. O comportamento do
      // Nodemailer é verificado nos testes unitários de MailService.
      .overrideProvider(MailService)
      .useValue({ sendCompanyCreated })
      .compile();

    app = setupApp(moduleRef.createNestApplication());
    prisma = app.get(PrismaService);
    await app.init();
  });

  // Limpa antes de cada caso: um teste que quebra no meio ainda deixa a tabela
  // vazia para o próximo.
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

    return response.body as Record<string, string> & {
      notificationSent: boolean;
    };
  }

  describe('POST /companies', () => {
    it('cadastra e devolve a empresa criada', async () => {
      const response = await http().post('/companies').send(payload).expect(201);

      expect(response.body).toMatchObject({
        name: payload.name,
        tradeName: payload.tradeName,
        address: payload.address,
        cnpj: CNPJ,
        notificationSent: true,
      });
      expect(response.body.id).toEqual(expect.any(String));
    });

    it('guarda a forma canônica do CNPJ, sem a máscara enviada', async () => {
      const created = await createCompany();
      const stored = await prisma.company.findUnique({
        where: { id: created.id },
      });

      expect(stored?.cnpj).toBe(CNPJ);
    });

    it('aceita CNPJ alfanumérico', async () => {
      const created = await createCompany({ cnpj: ALPHANUMERIC_MASKED });

      expect(created.cnpj).toBe(ALPHANUMERIC);
    });

    it('normaliza CNPJ alfanumérico em minúsculas', async () => {
      const created = await createCompany({ cnpj: '00.000.000/e08g-12' });

      expect(created.cnpj).toBe(ALPHANUMERIC);
    });

    it('dispara o aviso uma única vez, com a empresa gravada', async () => {
      const created = await createCompany();

      expect(sendCompanyCreated).toHaveBeenCalledTimes(1);
      expect(sendCompanyCreated).toHaveBeenCalledWith(
        expect.objectContaining({ id: created.id, cnpj: CNPJ }),
      );
    });

    it('cadastra e informa notificationSent: false quando o envio falha', async () => {
      const logged = vi
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});
      sendCompanyCreated.mockRejectedValue(new Error('smtp fora do ar'));

      const response = await http().post('/companies').send(payload).expect(201);

      expect(response.body.notificationSent).toBe(false);
      expect(logged).toHaveBeenCalledOnce();

      const stored = await prisma.company.findUnique({
        where: { id: response.body.id },
      });
      expect(stored).not.toBeNull();

      logged.mockRestore();
    });

    it('recusa CNPJ com dígito verificador errado', async () => {
      const response = await http()
        .post('/companies')
        .send({ ...payload, cnpj: '11.222.333/0001-99' })
        .expect(400);

      expect(response.body.fields).toMatchObject({ cnpj: expect.any(String) });
      expect(sendCompanyCreated).not.toHaveBeenCalled();
    });

    // Antes de aceitar letras, a limpeza com \D transformava esta entrada no
    // CNPJ válido 11222333000181.
    it('recusa texto inserido no meio do CNPJ', async () => {
      await http()
        .post('/companies')
        .send({ ...payload, cnpj: '11abc222.333/0001-81' })
        .expect(400);

      expect(await prisma.company.count()).toBe(0);
    });

    it('recusa caractere não permitido no CNPJ', async () => {
      await http()
        .post('/companies')
        .send({ ...payload, cnpj: '11!222333000181' })
        .expect(400);
    });

    it('recusa campos obrigatórios vazios, apontando cada um', async () => {
      const response = await http()
        .post('/companies')
        .send({ name: '', cnpj: '', tradeName: '', address: '' })
        .expect(400);

      expect(Object.keys(response.body.fields)).toEqual(
        expect.arrayContaining(['name', 'cnpj', 'tradeName', 'address']),
      );
    });

    it('recusa campo que não existe no cadastro', async () => {
      await http()
        .post('/companies')
        .send({ ...payload, salario: 1000 })
        .expect(400);
    });

    it('recusa CNPJ repetido e aponta o campo', async () => {
      await createCompany();

      const response = await http().post('/companies').send(payload).expect(409);

      expect(response.body).toMatchObject({
        statusCode: 409,
        fields: { cnpj: expect.any(String) },
      });
    });

    // A unicidade vale sobre a forma canônica, e não sobre o texto recebido.
    it('recusa o mesmo CNPJ enviado com e sem máscara', async () => {
      await createCompany({ cnpj: CNPJ_MASKED });

      await http()
        .post('/companies')
        .send({ ...payload, cnpj: CNPJ })
        .expect(409);
    });

    it('recusa o mesmo CNPJ alfanumérico em caixas diferentes', async () => {
      await createCompany({ cnpj: ALPHANUMERIC_MASKED });

      await http()
        .post('/companies')
        .send({ ...payload, cnpj: '00000000e08g12' })
        .expect(409);
    });

    it('não envia e-mail quando o cadastro é recusado', async () => {
      await createCompany();
      sendCompanyCreated.mockClear();

      await http().post('/companies').send(payload).expect(409);

      expect(sendCompanyCreated).not.toHaveBeenCalled();
    });
  });

  describe('GET /companies', () => {
    it('devolve lista vazia quando não há cadastro', async () => {
      await http().get('/companies').expect(200).expect([]);
    });

    it('devolve as empresas ordenadas da mais recente para a mais antiga', async () => {
      await createCompany();
      await createCompany({ cnpj: OTHER_CNPJ_MASKED, name: 'Bastos Logística LTDA' });

      const response = await http().get('/companies').expect(200);
      const criacoes = (response.body as Array<{ createdAt: string }>).map(
        (company) => new Date(company.createdAt).getTime(),
      );

      expect(response.body).toHaveLength(2);
      // Duas inserções seguidas podem cair no mesmo milissegundo, então o que
      // se verifica é a ordenação, não qual das duas ficou em primeiro.
      expect(criacoes).toEqual([...criacoes].sort((a, b) => b - a));
      expect(
        (response.body as Array<{ cnpj: string }>).map((c) => c.cnpj).sort(),
      ).toEqual([CNPJ, OTHER_CNPJ].sort());
    });
  });

  describe('GET /companies/:id', () => {
    it('devolve a empresa pelo id', async () => {
      const created = await createCompany();

      const response = await http().get(`/companies/${created.id}`).expect(200);

      expect(response.body.id).toBe(created.id);
    });

    it('não expõe notificationSent fora do cadastro', async () => {
      const created = await createCompany();

      const response = await http().get(`/companies/${created.id}`).expect(200);

      expect(response.body).not.toHaveProperty('notificationSent');
    });

    it('devolve 404 para id inexistente', async () => {
      await http()
        .get('/companies/3f1c2b9a-4d7e-4a52-9c0b-8e1d6f2a7b34')
        .expect(404);
    });

    it('devolve 400 para id que não é uuid', async () => {
      await http().get('/companies/abc').expect(400);
    });
  });

  describe('PATCH /companies/:id', () => {
    it('atualiza apenas o campo enviado', async () => {
      const created = await createCompany();

      const response = await http()
        .patch(`/companies/${created.id}`)
        .send({ tradeName: 'Bruno Transportes Express' })
        .expect(200);

      expect(response.body).toMatchObject({
        tradeName: 'Bruno Transportes Express',
        name: payload.name,
        address: payload.address,
        cnpj: CNPJ,
      });
      expect(
        new Date(response.body.updatedAt).getTime(),
      ).toBeGreaterThanOrEqual(new Date(created.createdAt).getTime());
    });

    it('aceita troca para CNPJ alfanumérico', async () => {
      const created = await createCompany();

      const response = await http()
        .patch(`/companies/${created.id}`)
        .send({ cnpj: ALPHANUMERIC_MASKED })
        .expect(200);

      expect(response.body.cnpj).toBe(ALPHANUMERIC);
    });

    it('recusa corpo vazio', async () => {
      const created = await createCompany();

      const response = await http()
        .patch(`/companies/${created.id}`)
        .send({})
        .expect(400);

      expect(response.body.message).toContain('ao menos um campo');
    });

    it('valida o CNPJ na atualização', async () => {
      const created = await createCompany();

      await http()
        .patch(`/companies/${created.id}`)
        .send({ cnpj: '11.222.333/0001-99' })
        .expect(400);
    });

    it('devolve 409 ao mudar para o CNPJ de outra empresa', async () => {
      const first = await createCompany();
      await createCompany({ cnpj: OTHER_CNPJ_MASKED, name: 'Bastos Logística LTDA' });

      await http()
        .patch(`/companies/${first.id}`)
        .send({ cnpj: OTHER_CNPJ_MASKED })
        .expect(409);
    });

    it('devolve 404 para id inexistente', async () => {
      await http()
        .patch('/companies/3f1c2b9a-4d7e-4a52-9c0b-8e1d6f2a7b34')
        .send({ tradeName: 'Qualquer' })
        .expect(404);
    });

    it('não dispara e-mail: o aviso é apenas do cadastro', async () => {
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

    it('devolve 404 ao remover duas vezes', async () => {
      const created = await createCompany();

      await http().delete(`/companies/${created.id}`).expect(204);
      await http().delete(`/companies/${created.id}`).expect(404);
    });
  });

  it('percorre o ciclo completo de cadastro, listagem, edição e exclusão', async () => {
    const created = await createCompany();
    expect(sendCompanyCreated).toHaveBeenCalledTimes(1);

    await http()
      .get('/companies')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveLength(1);
      });

    await http()
      .patch(`/companies/${created.id}`)
      .send({ address: 'Rua Bastos, 45 - Vila Nova, Jundiaí/SP' })
      .expect(200);

    await http()
      .get(`/companies/${created.id}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.address).toBe('Rua Bastos, 45 - Vila Nova, Jundiaí/SP');
      });

    await http().delete(`/companies/${created.id}`).expect(204);
    await http().get('/companies').expect(200).expect([]);
  });
});
