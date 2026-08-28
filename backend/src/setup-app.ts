import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { validationExceptionFactory } from './common/validation/validation-exception.factory.js';

// o main e os testes e2e passam por aqui. se a configuracao ficasse so no main,
// os testes rodariam contra uma aplicacao parecida, mas nao a mesma.
export function setupApp<T extends INestApplication>(app: T): T {
  app.useGlobalPipes(
    new ValidationPipe({
      // corta campo que nao esta no dto, e recusa quem tentar mandar de proposito
      whitelist: true,
      forbidNonWhitelisted: true,
      // sem isso o body chega como objeto cru e os @Transform dos dtos nao valem nada
      transform: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  return app;
}
