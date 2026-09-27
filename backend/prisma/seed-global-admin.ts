// ═══════════════════════════════════════════════════════════════
// Finanças Aksurim — Seed do Admin Global (TAREFA 26 / RN-15)
//
// Marca o usuário do Engenheiro Responsável (Joannderson Lucena)
// como `isGlobalAdmin = true`, habilitando o acesso ao Painel Aksurim.
//
// IMPORTANTE (RN-15): `isGlobalAdmin` é INDEPENDENTE de `Role.ADMIN`.
// A Role.ADMIN pertence ao chefe de família e NÃO concede acesso ao
// Painel Aksurim. Este script NÃO altera a Role do usuário.
//
// Idempotente: execução repetida apenas reafirma a flag como `true`.
//
// Uso:
//   npm run seed:global-admin
//   # ou, opcionalmente, informando o e-mail alvo:
//   GLOBAL_ADMIN_EMAIL="lucena@aksurim.com" npm run seed:global-admin
// ═══════════════════════════════════════════════════════════════

import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
import type { PrismaClient as PrismaClientType } from '@prisma/client';

// ───────────────────────────────────────────────────────────────
// 1) Carrega o `.env` do diretório `backend/` ANTES de instanciar
//    o PrismaClient. O Prisma CLI carrega `.env` automaticamente,
//    mas um script ts-node puro não.
//
//    `override: true` garante que o valor do arquivo `.env` prevaleça
//    sobre variáveis de ambiente já presentes no shell (evita poluição
//    do ambiente do host). Como o TypeScript hoista os `import`, o
//    PrismaClient é obtido via `require` dinâmico logo abaixo.
// ───────────────────────────────────────────────────────────────
const envCandidates = [
  resolve(process.cwd(), '.env'),
  resolve(__dirname, '..', '.env'),
];
const envPath = envCandidates.find((candidate) => existsSync(candidate));
if (envPath) {
  loadEnv({ path: envPath, override: true });
}

// ───────────────────────────────────────────────────────────────
// 2) Sanitiza `DATABASE_URL`: remove aspas delimitadoras residuais
//    (ex: "mysql://...") que algumas fontes de ambiente preservam.
//    O Prisma exige que a URL comece literalmente com `mysql://`.
// ───────────────────────────────────────────────────────────────
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(
    /^["']|["']$/g,
    '',
  );
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('@prisma/client') as {
  PrismaClient: new () => PrismaClientType;
};

const prisma = new PrismaClient();

/**
 * E-mail do Engenheiro Responsável (Product Owner).
 * Pode ser sobrescrito via variável de ambiente `GLOBAL_ADMIN_EMAIL`
 * para ambientes de homologação/produção sem alterar o código.
 */
const GLOBAL_ADMIN_EMAIL =
  process.env.GLOBAL_ADMIN_EMAIL?.toLowerCase().trim() ??
  'lucena@aksurim.com';

/**
 * Marca o usuário alvo como Admin Global de forma idempotente.
 *
 * @returns `true` se o usuário foi encontrado e atualizado; `false` caso
 *          o e-mail não exista na base (o script encerra com código de erro).
 */
async function promoteGlobalAdmin(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, isGlobalAdmin: true },
  });

  if (!user) {
    // eslint-disable-next-line no-console
    console.error(
      `❌ Usuário com e-mail "${email}" não encontrado. ` +
        'Cadastre o usuário antes de promovê-lo a Admin Global.',
    );
    return false;
  }

  if (user.isGlobalAdmin) {
    // eslint-disable-next-line no-console
    console.log(
      `ℹ️  Usuário "${user.name}" <${user.email}> já é Admin Global. Nada a fazer.`,
    );
    return true;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { isGlobalAdmin: true },
  });

  // eslint-disable-next-line no-console
  console.log(
    `✅ Usuário "${user.name}" <${user.email}> promovido a Admin Global (isGlobalAdmin = true).`,
  );
  return true;
}

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('═══ Aksurim — Seed do Admin Global (RN-15) ═══');
  // eslint-disable-next-line no-console
  console.log(`   E-mail alvo: ${GLOBAL_ADMIN_EMAIL}`);

  const success = await promoteGlobalAdmin(GLOBAL_ADMIN_EMAIL);

  if (!success) {
    process.exitCode = 1;
    return;
  }

  // eslint-disable-next-line no-console
  console.log('✅ Seed do Admin Global concluído com sucesso.');
}

main()
  .catch((error: unknown) => {
    // eslint-disable-next-line no-console
    console.error('❌ Falha no seed do Admin Global:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
