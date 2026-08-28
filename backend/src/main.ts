import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { validationExceptionFactory } from './common/validation/validation-exception.factory.js';
import type { Env } from './config/env.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<Env, true>);

  app.enableCors({ origin: config.get('CORS_ORIGIN', { infer: true }) });

  app.useGlobalPipes(
    new ValidationPipe({
      // corta campo que nao esta no dto, e recusa quem tentar mandar de proposito
      whitelist: true,
      forbidNonWhitelisted: true,
      // sem isso o body chega como objeto cru e os @Type dos dtos nao valem nada
      transform: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  // faz o onModuleDestroy rodar no ctrl+c e fechar o pool do prisma
  app.enableShutdownHooks();

  const swagger = new DocumentBuilder()
    .setTitle('Cadastro de Empresas')
    .setDescription(
      'API de cadastro de empresas. Toda empresa criada dispara um aviso por e-mail.',
    )
    .setVersion('1.0.0')
    .build();

  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swagger));

  await app.listen(config.get('PORT', { infer: true }));
}

await bootstrap();
