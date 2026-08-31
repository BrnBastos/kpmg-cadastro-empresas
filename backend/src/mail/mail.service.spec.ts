import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { Company } from '../generated/prisma/client.js';
import { MailService } from './mail.service.js';

const sendMail = vi.fn();
const createTransport = vi.fn((_options: unknown) => ({ sendMail }));

vi.mock('nodemailer', () => ({
  createTransport: (options: unknown) => createTransport(options),
}));

const ENV: Record<string, unknown> = {
  MAIL_HOST: 'localhost',
  MAIL_PORT: 1025,
  MAIL_SECURE: false,
  MAIL_USER: '',
  MAIL_PASSWORD: '',
  MAIL_FROM: 'Cadastro <nao-responda@brunotransportes.local>',
  MAIL_NOTIFICATION_RECIPIENTS: [
    'cadastro@brunotransportes.local',
    'financeiro@brunotransportes.local',
  ],
};

const company: Company = {
  id: '3f1c2b9a-4d7e-4a52-9c0b-8e1d6f2a7b34',
  name: 'Bruno Transportes LTDA',
  cnpj: '11222333000181',
  tradeName: 'Bruno Transportes',
  address: 'Rod. Anhanguera, km 78 - Campinas/SP',
  createdAt: new Date('2026-08-28T15:00:00.000Z'),
  updatedAt: new Date('2026-08-28T15:00:00.000Z'),
};

async function buildService(
  env: Record<string, unknown> = ENV,
): Promise<MailService> {
  const moduleRef = await Test.createTestingModule({
    providers: [
      MailService,
      { provide: ConfigService, useValue: { get: (key: string) => env[key] } },
    ],
  }).compile();

  return moduleRef.get(MailService);
}

describe('MailService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendMail.mockResolvedValue(undefined);
  });

  it('envia para o grupo configurado, com remetente e assunto certos', async () => {
    const service = await buildService();

    await service.sendCompanyCreated(company);

    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Cadastro <nao-responda@brunotransportes.local>',
        to: ['cadastro@brunotransportes.local', 'financeiro@brunotransportes.local'],
        subject: 'Nova empresa cadastrada: Bruno Transportes LTDA',
      }),
    );
  });

  it('leva os dados do cadastro no corpo, com o cnpj mascarado', async () => {
    const service = await buildService();

    await service.sendCompanyCreated(company);

    const [{ text, html }] = sendMail.mock.calls[0] as [
      { text: string; html: string },
    ];

    expect(text).toContain('Bruno Transportes LTDA');
    expect(text).toContain('11.222.333/0001-81');
    expect(html).toContain('11.222.333/0001-81');
  });

  // O Mailpit recusa o handshake se receber autenticação sem esperá-la.
  it('so manda autenticacao quando ha usuario configurado', async () => {
    await buildService();
    expect(createTransport).toHaveBeenCalledWith(
      expect.not.objectContaining({ auth: expect.anything() }),
    );

    createTransport.mockClear();

    await buildService({ ...ENV, MAIL_USER: 'user', MAIL_PASSWORD: 'senha' });
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ auth: { user: 'user', pass: 'senha' } }),
    );
  });

  it('limita o tempo de espera do smtp', async () => {
    await buildService();

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionTimeout: expect.any(Number),
        greetingTimeout: expect.any(Number),
        socketTimeout: expect.any(Number),
      }),
    );
  });

  // Quem decide que isto não invalida o cadastro é o CompaniesService.
  it('propaga a falha de envio', async () => {
    const service = await buildService();
    sendMail.mockRejectedValue(new Error('smtp fora do ar'));

    await expect(service.sendCompanyCreated(company)).rejects.toThrow(
      'smtp fora do ar',
    );
  });
});
