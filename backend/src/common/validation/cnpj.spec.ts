import { formatCnpj, isValidCnpj, onlyDigits } from './cnpj.js';

// cnpjs reais o suficiente: os digitos verificadores fecham a conta
const VALID = '11222333000181';
const VALID_MASKED = '11.222.333/0001-81';

describe('cnpj', () => {
  describe('isValidCnpj', () => {
    it('aceita cnpj valido com e sem mascara', () => {
      expect(isValidCnpj(VALID)).toBe(true);
      expect(isValidCnpj(VALID_MASKED)).toBe(true);
      expect(isValidCnpj('11.444.777/0001-61')).toBe(true);
    });

    it('recusa quando o digito verificador nao fecha', () => {
      // mesmo cnpj do caso feliz, so o ultimo digito trocado
      expect(isValidCnpj('11222333000182')).toBe(false);
      expect(isValidCnpj('11.222.333/0001-99')).toBe(false);
    });

    it('recusa tamanho diferente de 14 digitos', () => {
      expect(isValidCnpj('')).toBe(false);
      expect(isValidCnpj('1122233300018')).toBe(false);
      expect(isValidCnpj('112223330001811')).toBe(false);
    });

    // esses passariam na conta dos digitos, por isso o corte e explicito
    it('recusa sequencia de digitos repetidos', () => {
      expect(isValidCnpj('00000000000000')).toBe(false);
      expect(isValidCnpj('11111111111111')).toBe(false);
      expect(isValidCnpj('99999999999999')).toBe(false);
    });

    it('recusa texto que nao e numero', () => {
      expect(isValidCnpj('abcdefghijklmn')).toBe(false);
    });
  });

  describe('onlyDigits', () => {
    it('remove a mascara', () => {
      expect(onlyDigits(VALID_MASKED)).toBe(VALID);
    });
  });

  describe('formatCnpj', () => {
    it('coloca a mascara pra exibicao', () => {
      expect(formatCnpj(VALID)).toBe(VALID_MASKED);
    });

    it('devolve o valor original quando nao da pra formatar', () => {
      expect(formatCnpj('123')).toBe('123');
    });
  });
});
