import { z } from 'zod';

// z.coerce.boolean() devolve true pra string "false", porque so faz Boolean(valor).
// entao a leitura de booleano aqui e explicita.
const envBoolean = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

// a lista de destinatarios chega como uma string separada por virgula
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
  // o mailpit aceita conexao sem autenticar, por isso usuario e senha sao opcionais
  MAIL_USER: z.string().default(''),
  MAIL_PASSWORD: z.string().default(''),
  MAIL_FROM: z.string().min(1),
  MAIL_NOTIFICATION_RECIPIENTS: emailList,
});

export type Env = z.infer<typeof envSchema>;

// roda no boot, antes de qualquer modulo subir. se faltar variavel a aplicacao
// nem chega a escutar na porta, em vez de quebrar so na primeira requisicao.
export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    throw new Error(
      `Configuracao invalida no arquivo .env:\n${z.prettifyError(result.error)}`,
    );
  }

  return result.data;
}
