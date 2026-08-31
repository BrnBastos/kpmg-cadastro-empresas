import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { validationExceptionFactory } from './common/validation/validation-exception.factory.js';

// O main e os testes e2e passam por aqui. Se a configuração ficasse só no main,
// os testes rodariam contra uma aplicação parecida, mas não a mesma.
export function setupApp<T extends INestApplication>(app: T): T {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      // Sem isto o body chega cru e os @Transform dos DTOs não são aplicados.
      transform: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  return app;
}
