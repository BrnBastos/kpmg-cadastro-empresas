const BASE_LENGTH = 12;

// Únicos separadores que podem ser retirados. Qualquer outro caractere estranho
// é motivo para recusar o valor, e não para removê-lo silenciosamente.
const MASK_SEPARATORS = /[.\-/]/g;

// As doze primeiras posições aceitam letras no formato novo; os dois dígitos
// verificadores continuam sendo sempre numéricos.
const CANONICAL_FORMAT = /^[0-9A-Z]{12}[0-9]{2}$/;

const FIRST_DIGIT_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const SECOND_DIGIT_WEIGHTS = [6, ...FIRST_DIGIT_WEIGHTS];

/**
 * Devolve o CNPJ sem máscara e em maiúsculas, ou `null` se o valor tiver
 * caracteres fora do formato.
 */
export function normalizeCnpj(value: string): string | null {
  const canonical = value.trim().toUpperCase().replace(MASK_SEPARATORS, '');

  return CANONICAL_FORMAT.test(canonical) ? canonical : null;
}

// Regra da NT COCAD/SUARA/RFB 49/2024: cada caractere entra no módulo 11 pelo
// seu código ASCII menos 48. Para "0"-"9" isso devolve o próprio dígito, e para
// "A"-"Z" devolve de 17 a 42.
function characterValue(character: string): number {
  return character.charCodeAt(0) - 48;
}

function checkDigit(base: string, weights: number[]): number {
  const sum = weights.reduce(
    (total, weight, index) => total + characterValue(base[index]) * weight,
    0,
  );

  const remainder = sum % 11;

  return remainder < 2 ? 0 : 11 - remainder;
}

export function isValidCnpj(value: string): boolean {
  const canonical = normalizeCnpj(value);

  if (canonical === null) {
    return false;
  }

  // Um CNPJ com todos os caracteres iguais fecha o cálculo, mas não existe.
  if (/^(.)\1{13}$/.test(canonical)) {
    return false;
  }

  const base = canonical.slice(0, BASE_LENGTH);
  const first = checkDigit(base, FIRST_DIGIT_WEIGHTS);
  const second = checkDigit(`${base}${first}`, SECOND_DIGIT_WEIGHTS);

  return canonical.slice(BASE_LENGTH) === `${first}${second}`;
}

/** Formata para exibição: `11222333000181` vira `11.222.333/0001-81`. */
export function formatCnpj(value: string): string {
  const canonical = normalizeCnpj(value);

  if (canonical === null) {
    return value;
  }

  return [
    canonical.slice(0, 2),
    '.',
    canonical.slice(2, 5),
    '.',
    canonical.slice(5, 8),
    '/',
    canonical.slice(8, 12),
    '-',
    canonical.slice(12),
  ].join('');
}
