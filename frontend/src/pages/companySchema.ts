import { z } from 'zod';
import { isValidCnpj, normalizeCnpj } from '../lib/cnpj';

export const companySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'A razão social deve ter ao menos 2 caracteres.')
    .max(150, 'A razão social deve ter no máximo 150 caracteres.'),

  cnpj: z
    .string()
    .trim()
    .refine(isValidCnpj, 'CNPJ inválido.')
    // Sai daqui na forma canônica, que é o que a API armazena.
    .transform((value) => normalizeCnpj(value) ?? value),

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

export type CompanyFormValues = z.input<typeof companySchema>;
export type CompanyFormOutput = z.output<typeof companySchema>;
