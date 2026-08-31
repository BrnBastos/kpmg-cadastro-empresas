// Espelha os DTOs do backend. São dois projetos separados, e um passo de
// geração de tipos custaria mais a quem for rodar do que este arquivo custa.

export interface Company {
  id: string;
  name: string;
  /** Forma canônica: sem máscara e em maiúsculas. */
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

/** Resposta do cadastro, que informa se o aviso por e-mail chegou a sair. */
export interface CompanyCreated extends Company {
  notificationSent: boolean;
}

export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
  fields?: Record<string, string>;
  path: string;
  timestamp: string;
}
