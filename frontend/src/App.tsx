import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Link, Route, Routes } from 'react-router';
import { CompanyFormPage } from './pages/CompanyFormPage';
import { CompanyListPage } from './pages/CompanyListPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // cadastro de empresa muda pouco; refazer a busca a cada foco na janela
      // so gera requisicao sem motivo
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <header className="topbar">
          <div className="topbar__inner">
            <Link to="/" className="topbar__mark">
              KPMG
            </Link>
            <span className="topbar__title">Cadastro de Empresas</span>
          </div>
        </header>

        <main>
          <Routes>
            <Route path="/" element={<CompanyListPage />} />
            <Route path="/companies/new" element={<CompanyFormPage />} />
            <Route path="/companies/:id/edit" element={<CompanyFormPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function NotFound() {
  return (
    <div className="page">
      <div className="card state">
        <h2>Página não encontrada</h2>
        <p>O endereço acessado não existe neste sistema.</p>
        <Link to="/" className="btn btn--primary">
          Ir para a listagem
        </Link>
      </div>
    </div>
  );
}
