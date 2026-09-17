import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Porta dinâmica injetada pelo cPanel Node.js App Manager (§8.11).
  // NUNCA utilizar porta fixa em código.
  const port = Number(process.env.PORT) || 3000;

  await app.listen(port);
}

void bootstrap();
