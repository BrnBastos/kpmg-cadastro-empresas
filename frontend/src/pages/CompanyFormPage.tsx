import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import { ApiError } from '../api/client';
import {
  companiesKeys,
  createCompany,
  getCompany,
  updateCompany,
} from '../api/companies';
import type { CompanyInput } from '../api/types';
import { Alert } from '../components/Alert';
import { TextField } from '../components/TextField';
import { maskCnpj } from '../lib/cnpj';
import {
  companySchema,
  type CompanyFormOutput,
  type CompanyFormValues,
} from './companySchema';

const EMPTY: CompanyFormValues = {
  name: '',
  cnpj: '',
  tradeName: '',
  address: '',
};

// campos que o formulario conhece, pra so aceitar erro de servidor que caiba em um deles
const FIELD_NAMES = ['name', 'cnpj', 'tradeName', 'address'] as const;
type FieldName = (typeof FIELD_NAMES)[number];

function isFieldName(value: string): value is FieldName {
  return FIELD_NAMES.includes(value as FieldName);
}

export function CompanyFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<CompanyFormValues, unknown, CompanyFormOutput>({
    resolver: zodResolver(companySchema),
    defaultValues: EMPTY,
  });

  const existing = useQuery({
    queryKey: companiesKeys.detail(id ?? ''),
    queryFn: () => getCompany(id as string),
    enabled: isEditing,
  });

  // preenche o formulario quando os dados da empresa chegam
  useEffect(() => {
    if (existing.data) {
      reset({
        name: existing.data.name,
        cnpj: maskCnpj(existing.data.cnpj),
        tradeName: existing.data.tradeName,
        address: existing.data.address,
      });
    }
  }, [existing.data, reset]);

  const save = useMutation({
    mutationFn: (input: CompanyInput) =>
      isEditing ? updateCompany(id as string, input) : createCompany(input),

    onSuccess: async (company) => {
      await queryClient.invalidateQueries({ queryKey: companiesKeys.all });

      // volta pra listagem ja atualizada, com o recado do que aconteceu
      void navigate('/', {
        replace: true,
        state: {
          message: isEditing
            ? `Empresa ${company.name} atualizada.`
            : `Empresa ${company.name} cadastrada. O aviso por e-mail foi disparado.`,
        },
      });
    },

    onError: (error: ApiError) => {
      // a api diz qual campo recusou, entao a mensagem vai pro input certo
      // em vez de virar um alerta solto no topo da tela
      const [firstField] = Object.keys(error.fields ?? {}).filter(isFieldName);

      if (firstField && error.fields) {
        setError(firstField, {
          type: 'server',
          message: error.fields[firstField],
        });
        setFocus(firstField);
      }
    },
  });

  const onSubmit = handleSubmit((values) => save.mutateAsync(values).catch(() => undefined));

  // erro que nao coube em nenhum campo continua precisando aparecer
  const generalError =
    save.error instanceof ApiError &&
    !Object.keys(save.error.fields ?? {}).some(isFieldName)
      ? save.error.message
      : null;

  if (isEditing && existing.isPending) {
    return (
      <div className="page">
        <div className="card state">
          <p>Carregando dados da empresa...</p>
        </div>
      </div>
    );
  }

  if (isEditing && existing.isError) {
    return (
      <div className="page">
        <div className="card state">
          <h2>Não foi possível abrir a empresa</h2>
          <p>{(existing.error as ApiError).message}</p>
          <Link to="/" className="btn btn--outline">
            Voltar para a listagem
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>{isEditing ? 'Editar empresa' : 'Nova empresa'}</h1>
          <p>
            {isEditing
              ? 'Altere os dados e salve para atualizar o cadastro.'
              : 'O grupo configurado recebe um e-mail assim que a empresa for cadastrada.'}
          </p>
        </div>
      </header>

      <form className="card form" onSubmit={(event) => void onSubmit(event)} noValidate>
        {generalError && <Alert variant="error">{generalError}</Alert>}

        <TextField
          id="name"
          label="Razão social"
          autoComplete="organization"
          placeholder="Padaria Bom Dia LTDA"
          error={errors.name?.message}
          {...register('name')}
        />

        <TextField
          id="cnpj"
          label="CNPJ"
          inputMode="numeric"
          placeholder="00.000.000/0000-00"
          hint="Pode digitar com ou sem pontuação."
          error={errors.cnpj?.message}
          {...register('cnpj', {
            // a mascara entra enquanto digita, entao o campo nunca mostra
            // um numero corrido dificil de conferir
            onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
              setValue('cnpj', maskCnpj(event.target.value));
            },
          })}
        />

        <TextField
          id="tradeName"
          label="Nome fantasia"
          placeholder="Padaria Bom Dia"
          error={errors.tradeName?.message}
          {...register('tradeName')}
        />

        <TextField
          id="address"
          label="Endereço"
          autoComplete="street-address"
          placeholder="Rua das Flores, 123 - Centro, São Paulo/SP"
          error={errors.address?.message}
          {...register('address')}
        />

        <div className="form__actions">
          <Link to="/" className="btn btn--outline">
            Cancelar
          </Link>
          <button
            type="submit"
            className="btn btn--primary"
            // trava o envio enquanto a requisicao esta em curso, senao dois
            // cliques rapidos criam duas empresas
            disabled={isSubmitting || save.isPending}
          >
            {save.isPending
              ? 'Salvando...'
              : isEditing
                ? 'Salvar alterações'
                : 'Cadastrar empresa'}
          </button>
        </div>
      </form>
    </div>
  );
}
