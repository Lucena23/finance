/**
 * constants.ts — Constantes globais do frontend Finanças Aksurim.
 *
 * Centraliza valores de configuração reutilizáveis (URL base da API,
 * chaves de storage, enums espelhados do backend) evitando strings
 * mágicas espalhadas pelo código.
 */

/** Prefixo global da API REST (ARCHITECTURE §3.2). */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

/** Chave de persistência do token JWT no localStorage. */
export const AUTH_TOKEN_STORAGE_KEY = 'aksurim.auth.token';

/** Chave de persistência do usuário autenticado no localStorage. */
export const AUTH_USER_STORAGE_KEY = 'aksurim.auth.user';

/** Timeout padrão das requisições HTTP (ms). */
export const HTTP_TIMEOUT_MS = 15000;

/**
 * Papéis de usuário (espelho do enum Role do Prisma — RN-03).
 */
export const Role = {
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

/**
 * Tipos de despesa (espelho do enum ExpenseType do Prisma — RN-05).
 */
export const ExpenseType = {
  SINGLE: 'SINGLE',
  INSTALLMENT: 'INSTALLMENT',
  RECURRENT: 'RECURRENT',
} as const;
export type ExpenseType = (typeof ExpenseType)[keyof typeof ExpenseType];

/**
 * Status de recorrência (espelho do enum ExpenseRecurrenceStatus do Prisma).
 */
export const ExpenseRecurrenceStatus = {
  ACTIVE: 'ACTIVE',
  CANCELLED: 'CANCELLED',
} as const;
export type ExpenseRecurrenceStatus =
  (typeof ExpenseRecurrenceStatus)[keyof typeof ExpenseRecurrenceStatus];

/**
 * Status de pagamento (espelho do enum PaymentStatus do Prisma — RN-07).
 */
export const PaymentStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

/**
 * Agrupamentos visuais da fila de pagamentos por urgência (RN-06 / §8.5).
 */
export const QueueGroup = {
  OVERDUE: 'overdue',
  CURRENT_MONTH: 'currentMonth',
  UPCOMING: 'upcoming',
} as const;
export type QueueGroup = (typeof QueueGroup)[keyof typeof QueueGroup];

/**
 * Mapa de cores (classes Tailwind) por agrupamento de urgência da fila.
 * 🔴 Em atraso · 🟠 Mês atual · 🔵 Futuros.
 */
export const QUEUE_GROUP_COLORS: Record<QueueGroup, string> = {
  [QueueGroup.OVERDUE]: 'text-red-600',
  [QueueGroup.CURRENT_MONTH]: 'text-orange-500',
  [QueueGroup.UPCOMING]: 'text-blue-600',
};

/** Locale padrão para formatação de moeda e datas (pt-BR). */
export const DEFAULT_LOCALE = 'pt-BR';

/** Timezone padrão do produto (BRT/BRST — §8.11). */
export const DEFAULT_TIMEZONE = 'America/Sao_Paulo';
