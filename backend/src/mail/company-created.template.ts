import { formatCnpj } from '../common/validation/cnpj.js';
import type { Company } from '../generated/prisma/client.js';

const DATE_FORMAT = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
});

export interface CompanyCreatedMessage {
  subject: string;
  text: string;
  html: string;
}

function rows(company: Company): Array<[string, string]> {
  return [
    ['Razão social', company.name],
    ['CNPJ', formatCnpj(company.cnpj)],
    ['Nome fantasia', company.tradeName],
    ['Endereço', company.address],
    ['Criado em', DATE_FORMAT.format(company.createdAt)],
  ];
}

// Os valores vêm de campos abertos, então não entram crus no HTML.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Texto e HTML no mesmo envio: cliente que não renderiza HTML cai no texto.
export function buildCompanyCreatedMessage(
  company: Company,
): CompanyCreatedMessage {
  const fields = rows(company);

  const text = [
    'Uma nova empresa foi cadastrada.',
    '',
    ...fields.map(([label, value]) => `${label}: ${value}`),
  ].join('\n');

  const cells = fields
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:6px 16px 6px 0;color:#666;white-space:nowrap;">${label}</td>
          <td style="padding:6px 0;color:#111;font-weight:600;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join('');

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#111;">
      <h2 style="margin:0 0 4px;font-size:18px;">Nova empresa cadastrada</h2>
      <p style="margin:0 0 16px;color:#666;">Registro criado no sistema de cadastro de empresas.</p>
      <table style="border-collapse:collapse;">${cells}
      </table>
    </div>`;

  return {
    subject: `Nova empresa cadastrada: ${company.name}`,
    text,
    html,
  };
}
