import type { ApiErrorBody } from './types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// erro com o corpo da api junto, pra tela conseguir separar "o cnpj ja existe"
// de "a api esta fora do ar" sem inspecionar string de mensagem
export class ApiError extends Error {
  readonly status: number;
  readonly fields?: Record<string, string>;

  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }

  // sem status quer dizer que a requisicao nem chegou no servidor
  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

async function parseError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as ApiErrorBody;

    return new ApiError(body.message, response.status, body.fields);
  } catch {
    // resposta sem json: sobra o status pra explicar o que aconteceu
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
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(
      'Não foi possível falar com o servidor. Verifique se a API está no ar.',
      0,
    );
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  // o delete responde 204, sem corpo pra ler
  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
