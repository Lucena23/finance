import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Prefixo global da API (ARCHITECTURE §3.2).
  app.setGlobalPrefix('api/v1');

  // Segurança: Helmet protege os HTTP headers contra ataques comuns
  app.use(helmet());

  // Segurança: Controle estrito de Cross-Origin (CORS)
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
    : '*';
  app.enableCors({
    origin: corsOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

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
