import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

const localEnvPath = join(__dirname, '..', '..', '.env');
if (existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath, override: true });
}

/**
 * PrismaService — conexão com o banco MySQL via Prisma Client.
 * Gerencia o ciclo de vida da conexão (ARCHITECTURE §2 / TAREFA 7).
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super(
      process.env.DATABASE_URL
        ? { datasources: { db: { url: process.env.DATABASE_URL } } }
        : undefined,
    );
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
