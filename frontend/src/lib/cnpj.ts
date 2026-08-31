// Mesmas regras do backend, repetidas aqui para o erro aparecer enquanto a
// pessoa digita. A validação da API continua sendo a autoridade final.

const CNPJ_LENGTH = 14;
const BASE_LENGTH = 12;

const MASK_SEPARATORS = /[.\-/]/g;
const CANONICAL_FORMAT = /^[0-9A-Z]{12}[0-9]{2}$/;

const FIRST_DIGIT_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const SECOND_DIGIT_WEIGHTS = [6, ...FIRST_DIGIT_WEIGHTS];

/** Sem máscara e em maiúsculas, ou `null` se houver caractere fora do formato. */
export function normalizeCnpj(value: string): string | null {
  const canonical = value.trim().toUpperCase().replace(MASK_SEPARATORS, '');

  return CANONICAL_FORMAT.test(canonical) ? canonical : null;
}

// NT COCAD/SUARA/RFB 49/2024: cada caractere vale seu código ASCII menos 48.
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

  if (canonical === null || /^(.)\1{13}$/.test(canonical)) {
    return false;
  }

  const base = canonical.slice(0, BASE_LENGTH);
  const first = checkDigit(base, FIRST_DIGIT_WEIGHTS);
  const second = checkDigit(`${base}${first}`, SECOND_DIGIT_WEIGHTS);

  return canonical.slice(BASE_LENGTH) === `${first}${second}`;
}

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

// Só os separadores conhecidos são retirados. Qualquer outro caractere continua
// visível no campo, para a validação poder recusá-lo em vez de sumir com ele.
export function maskCnpj(value: string): string {
  const raw = value
    .replace(MASK_SEPARATORS, '')
    .toUpperCase()
    .slice(0, CNPJ_LENGTH);

  const groups: Array<[string, string]> = [
    ['', raw.slice(0, 2)],
    ['.', raw.slice(2, 5)],
    ['.', raw.slice(5, 8)],
    ['/', raw.slice(8, 12)],
    ['-', raw.slice(12, 14)],
  ];

  return groups
    .filter(([, group]) => group.length > 0)
    .map(([separator, group]) => `${separator}${group}`)
    .join('');
}
