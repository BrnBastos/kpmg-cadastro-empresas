import { formatCnpj, isValidCnpj, normalizeCnpj } from './cnpj.js';

const NUMERIC = '11222333000181';
const NUMERIC_MASKED = '11.222.333/0001-81';
// Primeiro CNPJ alfanumérico divulgado pela Receita Federal.
const ALPHANUMERIC = '00000000E08G12';
const ALPHANUMERIC_MASKED = '00.000.000/E08G-12';

describe('isValidCnpj', () => {
  it('aceita CNPJ numérico com e sem máscara', () => {
    expect(isValidCnpj(NUMERIC)).toBe(true);
    expect(isValidCnpj(NUMERIC_MASKED)).toBe(true);
    expect(isValidCnpj('11.444.777/0001-61')).toBe(true);
  });

  it('aceita CNPJ alfanumérico com e sem máscara', () => {
    expect(isValidCnpj(ALPHANUMERIC)).toBe(true);
    expect(isValidCnpj(ALPHANUMERIC_MASKED)).toBe(true);
    expect(isValidCnpj('11BRUNO0000110')).toBe(true);
  });

  it('normaliza letras minúsculas antes de validar', () => {
    expect(isValidCnpj('00000000e08g12')).toBe(true);
    expect(isValidCnpj('00.000.000/e08g-12')).toBe(true);
  });

  it('aceita espaços apenas nas extremidades', () => {
    expect(isValidCnpj('  11222333000181  ')).toBe(true);
    expect(isValidCnpj('11222333 000181')).toBe(false);
  });

  it('recusa dígito verificador incorreto', () => {
    expect(isValidCnpj('11222333000182')).toBe(false);
    expect(isValidCnpj('00000000E08G13')).toBe(false);
  });

  it('recusa tamanho diferente de 14 posições', () => {
    expect(isValidCnpj('')).toBe(false);
    expect(isValidCnpj('1122233300018')).toBe(false);
    expect(isValidCnpj('112223330001811')).toBe(false);
    expect(isValidCnpj('0000000E08G12')).toBe(false);
  });

  it('recusa caracteres fora do formato', () => {
    expect(isValidCnpj('11!222333000181')).toBe(false);
    expect(isValidCnpj('11@222333000181')).toBe(false);
    expect(isValidCnpj('11.222.333/0001_81')).toBe(false);
  });

  // Antes de aceitar letras, a limpeza usava \D e transformava esta entrada no
  // CNPJ válido 11222333000181.
  it('recusa texto inserido no meio de um CNPJ numérico', () => {
    expect(isValidCnpj('11abc222.333/0001-81')).toBe(false);
    expect(isValidCnpj('11ABC222333000181')).toBe(false);
  });

  it('recusa dígito verificador com letra', () => {
    expect(isValidCnpj('00000000E08G1A')).toBe(false);
  });

  it('recusa sequência de caracteres repetidos', () => {
    expect(isValidCnpj('00000000000000')).toBe(false);
    expect(isValidCnpj('11111111111111')).toBe(false);
    expect(isValidCnpj('AAAAAAAAAAAAAA')).toBe(false);
  });
});

describe('normalizeCnpj', () => {
  it('remove a máscara e devolve em maiúsculas', () => {
    expect(normalizeCnpj(NUMERIC_MASKED)).toBe(NUMERIC);
    expect(normalizeCnpj('00.000.000/e08g-12')).toBe(ALPHANUMERIC);
  });

  it('devolve null quando sobra caractere não permitido', () => {
    expect(normalizeCnpj('11abc222.333/0001-81')).toBeNull();
    expect(normalizeCnpj('11 222333000181')).toBeNull();
  });

  it('leva versões mascarada e sem máscara à mesma forma canônica', () => {
    expect(normalizeCnpj(NUMERIC_MASKED)).toBe(normalizeCnpj(NUMERIC));
    expect(normalizeCnpj(ALPHANUMERIC_MASKED)).toBe(normalizeCnpj(ALPHANUMERIC));
  });
});

describe('formatCnpj', () => {
  it('aplica a máscara nos dois formatos', () => {
    expect(formatCnpj(NUMERIC)).toBe(NUMERIC_MASKED);
    expect(formatCnpj(ALPHANUMERIC)).toBe(ALPHANUMERIC_MASKED);
  });

  it('devolve o valor original quando não dá para formatar', () => {
    expect(formatCnpj('123')).toBe('123');
  });
});
