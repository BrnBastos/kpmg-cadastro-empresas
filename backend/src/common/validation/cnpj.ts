const CNPJ_LENGTH = 14;

// pesos oficiais do calculo dos digitos verificadores
const FIRST_DIGIT_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const SECOND_DIGIT_WEIGHTS = [6, ...FIRST_DIGIT_WEIGHTS];

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function checkDigit(base: string, weights: number[]): number {
  const sum = weights.reduce(
    (total, weight, index) => total + Number(base[index]) * weight,
    0,
  );

  const remainder = sum % 11;

  return remainder < 2 ? 0 : 11 - remainder;
}

// valida os dois digitos verificadores, nao so o tamanho. um cnpj com 14 numeros
// aleatorios passa em qualquer regex, mas nao existe na receita.
export function isValidCnpj(value: string): boolean {
  const digits = onlyDigits(value);

  if (digits.length !== CNPJ_LENGTH) {
    return false;
  }

  // sequencias repetidas passam na conta dos digitos, entao ficam de fora na mao
  if (/^(\d)\1+$/.test(digits)) {
    return false;
  }

  const first = checkDigit(digits, FIRST_DIGIT_WEIGHTS);
  const second = checkDigit(digits, SECOND_DIGIT_WEIGHTS);

  return digits[12] === String(first) && digits[13] === String(second);
}

// so pra exibicao: 11222333000181 vira 11.222.333/0001-81
export function formatCnpj(value: string): string {
  const digits = onlyDigits(value);

  if (digits.length !== CNPJ_LENGTH) {
    return value;
  }

  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5',
  );
}
