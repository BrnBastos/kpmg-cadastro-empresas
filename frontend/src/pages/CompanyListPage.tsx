import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { companiesKeys, deleteCompany, listCompanies } from '../api/companies';
import { ApiError } from '../api/client';
import type { Company } from '../api/types';
import { Alert } from '../components/Alert';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { TrashIcon } from '../components/icons';
import { formatCnpj } from '../lib/cnpj';
import { formatDate, formatTime } from '../lib/date';

export function CompanyListPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [toRemove, setToRemove] = useState<Company | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  // guarda quem abriu o dialogo pra devolver o foco no fechamento
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // a tela de cadastro manda um recado por aqui ao voltar
  const flash = (location.state as { message?: string } | null)?.message;

  const companies = useQuery({
    queryKey: companiesKeys.all,
    queryFn: listCompanies,
  });

  const removal = useMutation({
    mutationFn: (company: Company) => deleteCompany(company.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: companiesKeys.all });
      closeDialog();
    },
    onError: (error: ApiError) => {
      setRemoveError(error.message);
      closeDialog();
    },
  });

  function askToRemove(company: Company, trigger: HTMLButtonElement) {
    triggerRef.current = trigger;
    setRemoveError(null);
    setToRemove(company);
  }

  function closeDialog() {
    setToRemove(null);
    // sem isso o foco volta pro body e quem usa teclado se perde na pagina
    triggerRef.current?.focus();
  }

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Empresas</h1>
          <p>Cadastro de empresas do grupo.</p>
        </div>

        <Link to="/companies/new" className="btn btn--primary">
          Cadastrar nova empresa
        </Link>
      </header>

      {flash && (
        <div style={{ marginBottom: 'var(--espaco-4)' }}>
          <Alert variant="success">{flash}</Alert>
        </div>
      )}

      {removeError && (
        <div style={{ marginBottom: 'var(--espaco-4)' }}>
          <Alert variant="error">{removeError}</Alert>
        </div>
      )}

      <div className="card">
        {companies.isPending && (
          <div className="state">
            <p>Carregando empresas...</p>
          </div>
        )}

        {companies.isError && (
          <div className="state">
            <h2>Não foi possível carregar a lista</h2>
            <p>{(companies.error as ApiError).message}</p>
            <button
              type="button"
              className="btn btn--outline"
              onClick={() => void companies.refetch()}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {companies.isSuccess && companies.data.length === 0 && (
          <div className="state">
            <h2>Nenhuma empresa cadastrada</h2>
            <p>
              Cadastre a primeira empresa para vê-la aqui. O grupo configurado
              recebe um e-mail a cada novo cadastro.
            </p>
            <Link to="/companies/new" className="btn btn--primary">
              Cadastrar nova empresa
            </Link>
          </div>
        )}

        {companies.isSuccess && companies.data.length > 0 && (
          <div className="table-wrap">
            <table>
              <caption className="sr-only">
                Empresas cadastradas, da mais recente para a mais antiga
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="col-name">Razão social</th>
                  <th scope="col">CNPJ</th>
                  <th scope="col" className="col-trade">Nome fantasia</th>
                  <th scope="col" className="col-address">Endereço</th>
                  <th scope="col" className="col-date">Criado em</th>
                  <th scope="col" className="col-date">Alterado em</th>
                  <th scope="col" className="col-actions">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {companies.data.map((company) => (
                  <tr key={company.id}>
                    <td className="cell-strong">{company.name}</td>
                    <td className="cell-mono">{formatCnpj(company.cnpj)}</td>
                    <td>{company.tradeName}</td>
                    <td>{company.address}</td>
                    <td className="cell-muted cell-mono">
                      <div className="cell-stack">
                        <span>{formatDate(company.createdAt)}</span>
                        <span className="cell-time">
                          {formatTime(company.createdAt)}
                        </span>
                      </div>
                    </td>
                    <td className="cell-muted cell-mono">
                      <div className="cell-stack">
                        <span>{formatDate(company.updatedAt)}</span>
                        <span className="cell-time">
                          {formatTime(company.updatedAt)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() =>
                            void navigate(`/companies/${company.id}/edit`)
                          }
                        >
                          Editar
                          <span className="sr-only"> {company.name}</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--ghost-danger"
                          onClick={(event) =>
                            askToRemove(company, event.currentTarget)
                          }
                        >
                          Excluir
                          <span className="sr-only"> {company.name}</span>
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={toRemove !== null}
        title="Excluir empresa"
        description={
          <>
            A empresa <strong>{toRemove?.name}</strong> será removida do
            cadastro. Esta ação não pode ser desfeita.
          </>
        }
        confirmLabel="Excluir"
        pending={removal.isPending}
        onConfirm={() => toRemove && removal.mutate(toRemove)}
        onCancel={closeDialog}
      />
    </div>
  );
}
