import { z } from 'zod';

// z.coerce.boolean() faz apenas Boolean(valor), então a string "false" viraria
// true. Por isso a leitura é explícita.
const envBoolean = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

const emailList = z
  .string()
  .transform((value) =>
    value
      .split(',')
      .map((email) => email.trim())
      .filter((email) => email.length > 0),
  )
  .pipe(z.array(z.email()).min(1));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.url(),

  DATABASE_URL: z.string().min(1),

  MAIL_HOST: z.string().min(1),
  MAIL_PORT: z.coerce.number().int().positive(),
  MAIL_SECURE: envBoolean.default(false),
  // O Mailpit aceita conexão sem autenticar, então as credenciais são opcionais.
  MAIL_USER: z.string().default(''),
  MAIL_PASSWORD: z.string().default(''),
  MAIL_FROM: z.string().min(1),
  MAIL_NOTIFICATION_RECIPIENTS: emailList,
});

export type Env = z.infer<typeof envSchema>;

// Roda antes de qualquer módulo subir: faltando variável, a aplicação nem chega
// a escutar na porta, em vez de falhar na primeira requisição.
export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    throw new Error(
      `Configuracao invalida no arquivo .env:\n${z.prettifyError(result.error)}`,
    );
  }

  return result.data;
}
