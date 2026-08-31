import { request } from './client';
import type { Company, CompanyCreated, CompanyInput } from './types';

export const companiesKeys = {
  all: ['companies'] as const,
  detail: (id: string) => ['companies', id] as const,
};

export function listCompanies(): Promise<Company[]> {
  return request<Company[]>('/companies');
}

export function getCompany(id: string): Promise<Company> {
  return request<Company>(`/companies/${id}`);
}

export function createCompany(input: CompanyInput): Promise<CompanyCreated> {
  return request<CompanyCreated>('/companies', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateCompany(
  id: string,
  input: Partial<CompanyInput>,
): Promise<Company> {
  return request<Company>(`/companies/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteCompany(id: string): Promise<void> {
  return request<void>(`/companies/${id}`, { method: 'DELETE' });
}
