import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import type { Env } from '../config/env.js';

// o prisma 7 nao le mais a DATABASE_URL sozinho: a conexao entra por um adapter,
// e quem sabe a url e o ConfigService, ja validado no boot.
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

  // sem isso o pool fica aberto e a suite de testes nao encerra
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
