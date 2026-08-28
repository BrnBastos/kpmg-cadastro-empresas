import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

// global pra nao precisar reimportar em cada modulo que fala com o banco
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
