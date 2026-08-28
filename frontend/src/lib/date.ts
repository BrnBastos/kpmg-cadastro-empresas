const OPTIONS = { timeZone: 'America/Sao_Paulo' } as const;

const DATE = new Intl.DateTimeFormat('pt-BR', { ...OPTIONS, dateStyle: 'short' });
const TIME = new Intl.DateTimeFormat('pt-BR', { ...OPTIONS, timeStyle: 'short' });

// a api devolve iso em utc, a tela mostra no horario de brasilia.
// data e hora saem separadas porque na tabela elas ficam em linhas diferentes,
// e assim a coluna nao rouba largura do endereco.
export function formatDate(value: string): string {
  return DATE.format(new Date(value));
}

export function formatTime(value: string): string {
  return TIME.format(new Date(value));
}
