import { z } from 'zod';
import { isValidCnpj, onlyDigits } from '../lib/cnpj';

// as regras acompanham as do dto do backend. a diferenca e o momento: aqui a
// pessoa ve o erro enquanto preenche, la e a garantia de que nada invalido grava.
export const companySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'A razão social deve ter ao menos 2 caracteres.')
    .max(150, 'A razão social deve ter no máximo 150 caracteres.'),

  cnpj: z
    .string()
    .trim()
    .refine((value) => isValidCnpj(value), 'CNPJ inválido.')
    // sai daqui ja sem mascara, do jeito que a api espera
    .transform(onlyDigits),

  tradeName: z
    .string()
    .trim()
    .min(2, 'O nome fantasia deve ter ao menos 2 caracteres.')
    .max(150, 'O nome fantasia deve ter no máximo 150 caracteres.'),

  address: z
    .string()
    .trim()
    .min(5, 'O endereço deve ter ao menos 5 caracteres.')
    .max(255, 'O endereço deve ter no máximo 255 caracteres.'),
});

// o formulario trabalha com o cnpj mascarado, a api recebe so digitos
export type CompanyFormValues = z.input<typeof companySchema>;
export type CompanyFormOutput = z.output<typeof companySchema>;
