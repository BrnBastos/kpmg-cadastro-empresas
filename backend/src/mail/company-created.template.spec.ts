import type { Company } from '../generated/prisma/client.js';
import { buildCompanyCreatedMessage } from './company-created.template.js';

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

describe('buildCompanyCreatedMessage', () => {
  it('leva a razao social no assunto', () => {
    const message = buildCompanyCreatedMessage(companyFixture());

    expect(message.subject).toBe(
      'Nova empresa cadastrada: Padaria Bom Dia LTDA',
    );
  });

  it('mostra o cnpj com mascara, e nao como esta no banco', () => {
    const message = buildCompanyCreatedMessage(companyFixture());

    expect(message.text).toContain('11.222.333/0001-81');
    expect(message.html).toContain('11.222.333/0001-81');
    expect(message.text).not.toContain('11222333000181');
  });

  it('traz todos os dados do cadastro no corpo', () => {
    const message = buildCompanyCreatedMessage(companyFixture());

    for (const value of [
      'Padaria Bom Dia LTDA',
      'Padaria Bom Dia',
      'Rua das Flores, 123 - Centro',
    ]) {
      expect(message.text).toContain(value);
      expect(message.html).toContain(value);
    }
  });

  // o nome vem de um campo aberto, entao nao pode virar tag dentro do e-mail
  it('escapa html vindo do cadastro', () => {
    const message = buildCompanyCreatedMessage(
      companyFixture({ name: '<script>alert(1)</script> LTDA' }),
    );

    expect(message.html).not.toContain('<script>');
    expect(message.html).toContain('&lt;script&gt;');
  });
});
