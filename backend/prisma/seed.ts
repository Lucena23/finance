// ═══════════════════════════════════════════════════════════════
// Finanças Aksurim — Seed de Desenvolvimento (TAREFA 9)
// Cria: 1 FamilyAccount, 1 ADMIN, 1 MEMBER, categorias base e
// despesas dos 3 tipos (SINGLE, INSTALLMENT, RECURRENT).
// Idempotente: execução repetida NÃO duplica registros.
// ═══════════════════════════════════════════════════════════════

import {
  ExpenseRecurrenceStatus,
  ExpenseType,
  PaymentStatus,
  PrismaClient,
  Role,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const BCRYPT_SALT_ROUNDS = 12;

// ─── Identificadores fixos (garantem idempotência) ───
const FAMILY_CPF = '111.444.777-35';
const ADMIN_EMAIL = 'admin@aksurim.dev';
const MEMBER_EMAIL = 'membro@aksurim.dev';
const SEED_PASSWORD = 'aksurim123';

/**
 * Geração de iniciais a partir do nome (REGRAS §8.8).
 */
function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);

  if (parts.length === 0) {
    return '';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

/**
 * Retorna o primeiro dia do mês deslocado em `offset` meses a partir de hoje.
 * Utiliza aritmética de data pura (sem ponto flutuante).
 */
function monthStart(offset: number): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + offset, 1);
}

/**
 * Retorna uma data de vencimento no mês deslocado em `offset` meses,
 * fixada no dia informado (clampado ao último dia do mês quando necessário).
 */
function dueDateInMonth(offset: number, day: number): Date {
  const base = monthStart(offset);
  const year = base.getFullYear();
  const month = base.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const safeDay = Math.min(day, lastDay);
  return new Date(year, month, safeDay);
}

/**
 * Distribui `totalAmount` (centavos) em N parcelas com aritmética inteira.
 * Parcelas 1..N-1 = floor(total/N); última = total - (valor * (N-1)).
 * REGRAS §8.2 / §8.4.
 */
function splitInstallments(totalAmount: number, n: number): number[] {
  const base = Math.floor(totalAmount / n);
  const amounts: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    amounts.push(base);
  }
  amounts.push(totalAmount - base * (n - 1));
  return amounts;
}

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, BCRYPT_SALT_ROUNDS);

  // ─── FamilyAccount (idempotente por ownerCpf único) ───
  const family = await prisma.familyAccount.upsert({
    where: { ownerCpf: FAMILY_CPF },
    update: { name: 'Família Aksurim (Dev)' },
    create: {
      name: 'Família Aksurim (Dev)',
      ownerCpf: FAMILY_CPF,
    },
  });

  // ─── ADMIN (idempotente por email único) ───
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      name: 'Joannderson Lucena',
      role: Role.ADMIN,
      initials: getInitials('Joannderson Lucena'),
      avatarColor: '#3B82F6',
      familyAccountId: family.id,
    },
    create: {
      name: 'Joannderson Lucena',
      email: ADMIN_EMAIL,
      passwordHash,
      role: Role.ADMIN,
      initials: getInitials('Joannderson Lucena'),
      avatarColor: '#3B82F6',
      familyAccountId: family.id,
    },
  });

  // ─── MEMBER (idempotente por email único) ───
  const member = await prisma.user.upsert({
    where: { email: MEMBER_EMAIL },
    update: {
      name: 'Maria Silva',
      role: Role.MEMBER,
      initials: getInitials('Maria Silva'),
      avatarColor: '#EC4899',
      familyAccountId: family.id,
    },
    create: {
      name: 'Maria Silva',
      email: MEMBER_EMAIL,
      passwordHash,
      role: Role.MEMBER,
      initials: getInitials('Maria Silva'),
      avatarColor: '#EC4899',
      familyAccountId: family.id,
    },
  });

  // ─── Categorias base (idempotente por nome + workspace) ───
  const categorySeeds: { name: string; color: string; icon: string }[] = [
    { name: 'Moradia', color: '#3B82F6', icon: 'home' },
    { name: 'Energia', color: '#F59E0B', icon: 'zap' },
    { name: 'Internet', color: '#06B6D4', icon: 'wifi' },
    { name: 'Cartão de Crédito', color: '#8B5CF6', icon: 'credit-card' },
    { name: 'Transporte', color: '#22C55E', icon: 'car' },
  ];

  const categories: Record<string, string> = {};
  for (const seed of categorySeeds) {
    const existing = await prisma.category.findFirst({
      where: { name: seed.name, familyAccountId: family.id },
      select: { id: true },
    });

    const category = existing
      ? await prisma.category.update({
          where: { id: existing.id },
          data: { color: seed.color, icon: seed.icon },
        })
      : await prisma.category.create({
          data: {
            name: seed.name,
            color: seed.color,
            icon: seed.icon,
            familyAccountId: family.id,
          },
        });

    categories[seed.name] = category.id;
  }

  // ─── Despesas de exemplo (idempotente por título + workspace) ───
  // Remove despesas de seed anteriores (e seus PaymentItems) para evitar
  // duplicação. A ordem respeita a FK: PaymentItems antes de Expenses.
  const seedTitles = [
    'Conta de Energia (Avulsa)',
    'Notebook (Parcelada)',
    'Internet Fibra (Recorrente)',
  ];

  const previousExpenses = await prisma.expense.findMany({
    where: { title: { in: seedTitles }, familyAccountId: family.id },
    select: { id: true },
  });
  const previousExpenseIds = previousExpenses.map((expense) => expense.id);

  if (previousExpenseIds.length > 0) {
    await prisma.$transaction([
      prisma.paymentItem.deleteMany({
        where: { expenseId: { in: previousExpenseIds } },
      }),
      prisma.expense.deleteMany({
        where: { id: { in: previousExpenseIds } },
      }),
    ]);
  }

  // ── SINGLE: 1 PaymentItem ──
  const singleAmount = 18990; // R$ 189,90
  await prisma.expense.create({
    data: {
      title: 'Conta de Energia (Avulsa)',
      description: 'Despesa avulsa de exemplo (seed).',
      type: ExpenseType.SINGLE,
      totalAmount: singleAmount,
      statusRecurrence: ExpenseRecurrenceStatus.ACTIVE,
      categoryId: categories['Energia'],
      familyAccountId: family.id,
      createdById: admin.id,
      paymentItems: {
        create: [
          {
            dueDate: dueDateInMonth(0, 10),
            installmentNumber: 1,
            totalInstallments: 1,
            expectedAmount: singleAmount,
            status: PaymentStatus.PENDING,
          },
        ],
      },
    },
  });

  // ── INSTALLMENT: N PaymentItems com resíduo na última ──
  const installmentTotal = 300000; // R$ 3.000,00
  const installmentCount = 6;
  const installmentAmounts = splitInstallments(
    installmentTotal,
    installmentCount,
  );

  await prisma.expense.create({
    data: {
      title: 'Notebook (Parcelada)',
      description: 'Despesa parcelada de exemplo (seed).',
      type: ExpenseType.INSTALLMENT,
      totalAmount: installmentTotal,
      statusRecurrence: ExpenseRecurrenceStatus.ACTIVE,
      categoryId: categories['Cartão de Crédito'],
      familyAccountId: family.id,
      createdById: admin.id,
      paymentItems: {
        create: installmentAmounts.map((amount, index) => ({
          dueDate: dueDateInMonth(index, 15),
          installmentNumber: index + 1,
          totalInstallments: installmentCount,
          expectedAmount: amount,
          status: PaymentStatus.PENDING,
        })),
      },
    },
  });

  // ── RECURRENT: projeção mensal (mês corrente + 5 futuros) ──
  const recurrentAmount = 9990; // R$ 99,90
  const recurrentProjection = 6;

  await prisma.expense.create({
    data: {
      title: 'Internet Fibra (Recorrente)',
      description: 'Despesa recorrente de exemplo (seed).',
      type: ExpenseType.RECURRENT,
      totalAmount: recurrentAmount,
      statusRecurrence: ExpenseRecurrenceStatus.ACTIVE,
      categoryId: categories['Internet'],
      familyAccountId: family.id,
      createdById: admin.id,
      paymentItems: {
        create: Array.from({ length: recurrentProjection }, (_, index) => ({
          dueDate: dueDateInMonth(index, 5),
          installmentNumber: index + 1,
          totalInstallments: 0,
          expectedAmount: recurrentAmount,
          status: PaymentStatus.PENDING,
        })),
      },
    },
  });

  // eslint-disable-next-line no-console
  console.log('✅ Seed concluído com sucesso.');
  // eslint-disable-next-line no-console
  console.log(`   FamilyAccount: ${family.name} (${family.id})`);
  // eslint-disable-next-line no-console
  console.log(`   ADMIN: ${admin.email} / senha: ${SEED_PASSWORD}`);
  // eslint-disable-next-line no-console
  console.log(`   MEMBER: ${member.email} / senha: ${SEED_PASSWORD}`);
}

main()
  .catch((error: unknown) => {
    // eslint-disable-next-line no-console
    console.error('❌ Falha no seed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
