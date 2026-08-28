import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import type { Env } from '../config/env.js';
import type { Company } from '../generated/prisma/client.js';
import { buildCompanyCreatedMessage } from './company-created.template.js';

// teto pra cada etapa da conversa com o servidor smtp
const SMTP_TIMEOUT_MS = 5_000;

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;
  private readonly recipients: string[];

  constructor(private readonly config: ConfigService<Env, true>) {
    const user = this.config.get('MAIL_USER', { infer: true });
    const password = this.config.get('MAIL_PASSWORD', { infer: true });

    this.transporter = createTransport({
      host: this.config.get('MAIL_HOST', { infer: true }),
      port: this.config.get('MAIL_PORT', { infer: true }),
      secure: this.config.get('MAIL_SECURE', { infer: true }),
      // o mailpit aceita conexao sem login. so manda auth quando tem credencial,
      // senao ele recusa o handshake.
      ...(user ? { auth: { user, pass: password } } : {}),
      // sem limite explicito o nodemailer fica minutos tentando quando o smtp
      // esta fora, e o cadastro que disparou o aviso ficaria esperando junto
      connectionTimeout: SMTP_TIMEOUT_MS,
      greetingTimeout: SMTP_TIMEOUT_MS,
      socketTimeout: SMTP_TIMEOUT_MS,
    });

    this.from = this.config.get('MAIL_FROM', { infer: true });
    this.recipients = this.config.get('MAIL_NOTIFICATION_RECIPIENTS', {
      infer: true,
    });
  }

  // envia e deixa o erro subir. quem decide que uma falha de e-mail nao invalida
  // o cadastro e o CompaniesService, porque essa e uma regra do cadastro e nao
  // do envio.
  async sendCompanyCreated(company: Company): Promise<void> {
    const message = buildCompanyCreatedMessage(company);

    await this.transporter.sendMail({
      from: this.from,
      to: this.recipients,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    this.logger.log(
      `Aviso de cadastro enviado para ${this.recipients.join(', ')} (empresa ${company.id})`,
    );
  }
}
