// mesma regra do backend. repetida aqui pra pessoa ver o erro enquanto digita,
// em vez de descobrir so depois de enviar. quem manda no cadastro continua
// sendo a api.

const CNPJ_LENGTH = 14;
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

export function isValidCnpj(value: string): boolean {
  const digits = onlyDigits(value);

  if (digits.length !== CNPJ_LENGTH || /^(\d)\1+$/.test(digits)) {
    return false;
  }

  return (
    digits[12] === String(checkDigit(digits, FIRST_DIGIT_WEIGHTS)) &&
    digits[13] === String(checkDigit(digits, SECOND_DIGIT_WEIGHTS))
  );
}

// 11222333000181 -> 11.222.333/0001-81
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

// aplica a mascara enquanto a pessoa digita, aceitando valor incompleto
export function maskCnpj(value: string): string {
  const digits = onlyDigits(value).slice(0, CNPJ_LENGTH);

  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}
