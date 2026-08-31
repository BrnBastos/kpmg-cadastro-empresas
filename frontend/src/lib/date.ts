const OPTIONS = { timeZone: 'America/Sao_Paulo' } as const;

const DATE = new Intl.DateTimeFormat('pt-BR', { ...OPTIONS, dateStyle: 'short' });
const TIME = new Intl.DateTimeFormat('pt-BR', { ...OPTIONS, timeStyle: 'short' });

// A API devolve ISO em UTC; a tela mostra no horário de Brasília. Data e hora
// saem separadas porque a tabela as exibe em linhas diferentes.
export function formatDate(value: string): string {
  return DATE.format(new Date(value));
}

export function formatTime(value: string): string {
  return TIME.format(new Date(value));
}
