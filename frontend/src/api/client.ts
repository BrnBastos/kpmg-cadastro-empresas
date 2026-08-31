import type { ApiErrorBody } from './types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// Carrega o corpo da API para a tela distinguir "CNPJ já existe" de "API fora
// do ar" sem inspecionar texto de mensagem.
export class ApiError extends Error {
  readonly status: number;
  readonly fields?: Record<string, string>;

  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }

  // Sem status quer dizer que a requisição nem chegou ao servidor.
  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

async function parseError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as ApiErrorBody;

    return new ApiError(body.message, response.status, body.fields);
  } catch {
    return new ApiError(
      `A requisição falhou (HTTP ${response.status}).`,
      response.status,
    );
  }
}

export async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);

  // Só declara JSON quando há corpo. Em GET, esse cabeçalho provocaria um
  // preflight de CORS sem necessidade.
  if (init?.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(
      'Não foi possível falar com o servidor. Verifique se a API está no ar.',
      0,
    );
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
