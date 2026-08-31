import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import type { Env } from '../config/env.js';

// O Prisma 7 não lê mais a DATABASE_URL sozinho: a conexão entra por um adapter,
// e quem conhece a URL é o ConfigService, já validado no boot.
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: ConfigService<Env, true>) {
    super({
      adapter: new PrismaPg({
        connectionString: config.get('DATABASE_URL', { infer: true }),
      }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  // Sem isto o pool fica aberto e a suíte de testes não encerra.
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
