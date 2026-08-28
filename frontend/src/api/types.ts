// espelho dos dtos do backend. escrito a mao de proposito: sao dois projetos
// separados, e um passo de geracao de tipos custaria mais pra quem for rodar
// do que este arquivo custa pra manter.

export interface Company {
  id: string;
  name: string;
  /** apenas digitos, do jeito que o banco guarda */
  cnpj: string;
  tradeName: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyInput {
  name: string;
  cnpj: string;
  tradeName: string;
  address: string;
}

// formato unico de erro que a api devolve
export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
  fields?: Record<string, string>;
  path: string;
  timestamp: string;
}
