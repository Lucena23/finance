import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Prefixo global da API (ARCHITECTURE §3.2).
  app.setGlobalPrefix('api/v1');

  // Validação global de DTOs com class-validator (ARCHITECTURE §1).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Porta dinâmica injetada pelo cPanel Node.js App Manager (§8.11).
  // NUNCA utilizar porta fixa em código.
  const port = Number(process.env.PORT) || 3000;

  await app.listen(port);
}

void bootstrap();
