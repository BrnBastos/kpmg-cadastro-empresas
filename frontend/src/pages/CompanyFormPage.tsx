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
import type { Company, CompanyInput } from '../api/types';
import { Alert } from '../components/Alert';
import { TextField } from '../components/TextField';
import { maskCnpj } from '../lib/cnpj';
import type { FlashMessage } from './flash';
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

const FIELD_NAMES = ['name', 'cnpj', 'tradeName', 'address'] as const;
type FieldName = (typeof FIELD_NAMES)[number];

function isFieldName(value: string): value is FieldName {
  return FIELD_NAMES.includes(value as FieldName);
}

interface SaveResult {
  company: Company;
  /** `null` na edição, que não dispara aviso. */
  notificationSent: boolean | null;
}

function successMessage(
  { company, notificationSent }: SaveResult,
  isEditing: boolean,
): FlashMessage {
  if (isEditing) {
    return { text: `Empresa ${company.name} atualizada.`, variant: 'success' };
  }

  if (notificationSent) {
    return {
      text: `Empresa ${company.name} cadastrada e o aviso por e-mail foi enviado.`,
      variant: 'success',
    };
  }

  return {
    text: `Empresa ${company.name} cadastrada, mas o aviso por e-mail não pôde ser enviado.`,
    variant: 'warning',
  };
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
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<CompanyFormValues, unknown, CompanyFormOutput>({
    resolver: zodResolver(companySchema),
    defaultValues: EMPTY,
  });

  const existing = useQuery({
    queryKey: companiesKeys.detail(id ?? ''),
    queryFn: () => getCompany(id as string),
    enabled: isEditing,
  });

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

  const save = useMutation<SaveResult, ApiError, Partial<CompanyInput>>({
    mutationFn: async (input) => {
      if (isEditing) {
        const company = await updateCompany(id as string, input);

        return { company, notificationSent: null };
      }

      const { notificationSent, ...company } = await createCompany(
        input as CompanyInput,
      );

      return { company, notificationSent };
    },

    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: companiesKeys.all });

      void navigate('/', {
        replace: true,
        state: { flash: successMessage(result, isEditing) },
      });
    },

    onError: (error) => {
      // A API diz qual campo recusou, então a mensagem vai para o input certo.
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

  const onSubmit = handleSubmit(async (values) => {
    if (!isEditing) {
      await save.mutateAsync(values).catch(() => undefined);

      return;
    }

    // Na edição só sobem os campos que mudaram, que é o que o PATCH espera.
    const changed = Object.fromEntries(
      Object.entries(values).filter(([field]) => field in dirtyFields),
    ) as Partial<CompanyInput>;

    if (Object.keys(changed).length === 0) {
      void navigate('/', {
        replace: true,
        state: {
          flash: { text: 'Nenhuma alteração para salvar.', variant: 'success' },
        },
      });

      return;
    }

    await save.mutateAsync(changed).catch(() => undefined);
  });

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

      <form
        className="card form"
        onSubmit={(event) => void onSubmit(event)}
        noValidate
      >
        {generalError && <Alert variant="error">{generalError}</Alert>}

        <TextField
          id="name"
          label="Razão social"
          autoComplete="organization"
          placeholder="Bruno Transportes LTDA"
          error={errors.name?.message}
          {...register('name')}
        />

        <TextField
          id="cnpj"
          label="CNPJ"
          placeholder="11.222.333/0001-81"
          hint="Aceita o formato numérico e o alfanumérico, com ou sem pontuação."
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          error={errors.cnpj?.message}
          {...register('cnpj', {
            onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
              setValue('cnpj', maskCnpj(event.target.value), {
                shouldDirty: true,
              });
            },
          })}
        />

        <TextField
          id="tradeName"
          label="Nome fantasia"
          placeholder="Bruno Transportes"
          error={errors.tradeName?.message}
          {...register('tradeName')}
        />

        <TextField
          id="address"
          label="Endereço"
          autoComplete="street-address"
          placeholder="Rod. Anhanguera, km 78 - Campinas/SP"
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
            // Dois cliques rápidos criariam duas empresas.
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
