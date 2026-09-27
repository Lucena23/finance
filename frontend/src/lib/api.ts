/**
 * api.ts — Cliente HTTP tipado do frontend Finanças Aksurim.
 *
 * Encapsula o Axios com:
 *  - Injeção automática do Bearer token (JWT) em todas as requisições.
 *  - Tratamento padronizado de erros da API.
 *  - Tipagem ponta-a-ponta dos contratos REST (ARCHITECTURE §3.2).
 *
 * REGRA (§8.1): proibido o uso de `any`. Todos os payloads são tipados.
 *
 * TAREFA 9: A persistência do token JWT foi migrada de `localStorage` para
 * `sessionStorage`. Isso garante que, ao fechar a aba/navegador, a sessão
 * seja encerrada (comportamento esperado pelo produto — BLUEPRINT §4).
 *
 * NOTA SOBRE WEB PUSH: A subscription de Web Push NÃO reside no storage do
 * frontend — ela é mantida pelo navegador no `pushManager` do Service Worker
 * (persistente e independente do storage de sessão). Portanto, a migração
 * para `sessionStorage` NÃO causa regressão nas subscriptions de push: o
 * registro no backend (POST /notifications/subscribe) continua válido e o
 * navegador segue entregando os eventos `push` ao Service Worker mesmo após
 * o fechamento da aba. O `sessionStorage` apenas controla a sessão de UI.
 */

import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

import {
  API_BASE_URL,
  AUTH_TOKEN_STORAGE_KEY,
  ExpenseRecurrenceStatus,
  ExpenseType,
  HTTP_TIMEOUT_MS,
  PaymentStatus,
  Role,
} from './constants';

// ═══════════════════════════════════════════
// TIPOS DE DOMÍNIO (espelho dos contratos REST)
// ═══════════════════════════════════════════

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  initials: string;
  avatarColor: string;
  familyAccountId: string;
}

export interface AuthResponse {
  accessToken: string;
  user: SafeUser;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  whatsapp?: string;
  password: string;
  familyName: string;
  ownerCpf: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  familyAccountId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentItem {
  id: string;
  expenseId: string;
  dueDate: string;
  installmentNumber: number;
  totalInstallments: number;
  expectedAmount: number;
  paidAmount: number | null;
  paidAt: string | null;
  paidById: string | null;
  status: PaymentStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  expense?: {
    title: string;
    categoryId: string;
  };
}

/**
 * Badge do pagador (RN-08 / §8.8) — hidratado pelo backend em uma única query
 * (sem N+1). Presente na fila, no histórico e na resposta de quitação.
 */
export interface PayerBadge {
  initials: string;
  avatarColor: string;
}

export interface PaymentItemWithPayer extends PaymentItem {
  paidBy: PayerBadge | null;
}

export interface Expense {
  id: string;
  title: string;
  description: string | null;
  type: ExpenseType;
  totalAmount: number;
  statusRecurrence: ExpenseRecurrenceStatus;
  categoryId: string;
  familyAccountId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ExpenseWithItems extends Expense {
  paymentItems: PaymentItem[];
}

/**
 * Fila de pagamentos pendentes agrupada por urgência (RN-06 / §8.5).
 *
 * TAREFA 13: cada item carrega o badge do pagador (`paidBy`) já hidratado,
 * permitindo exibir imediatamente as iniciais de quem quitou sem refetch.
 */
export interface PaymentQueue {
  overdue: PaymentItemWithPayer[];
  currentMonth: PaymentItemWithPayer[];
  upcoming: PaymentItemWithPayer[];
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
}

export interface PayItemPayload {
  paidAmount: number;
  paidAt: string;
  notes?: string;
}

export interface DashboardSummary {
  totalPaidMonth: number;
  totalPendingMonth: number;
  memberBreakdown: {
    userId: string;
    name: string;
    initials: string;
    avatarColor: string;
    totalPaid: number;
  }[];
}

export interface CategoryDistribution {
  categoryId: string;
  name: string;
  color: string;
  totalAmount: number;
  percentage: number;
}

export interface MonthlyEvolution {
  month: number;
  totalPaid: number;
  totalPending: number;
}

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Payload do formulário de Suporte (TAREFA 20 / RN-14).
 * O `familyAccountId` NÃO é enviado — o escopo é derivado do JWT no backend.
 */
export interface SupportMessagePayload {
  subject: string;
  message: string;
  contact?: string;
}

/**
 * Resposta do endpoint POST /support (TAREFA 21).
 */
export interface SupportMessageResult {
  delivered: boolean;
  message: string;
}

/**
 * Erro normalizado da API — expõe status HTTP e mensagem legível.
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly path?: string;

  constructor(message: string, status: number, path?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.path = path;
  }
}

// ═══════════════════════════════════════════
// GERENCIAMENTO DE TOKEN (sessionStorage — TAREFA 9)
// ═══════════════════════════════════════════

/**
 * Recupera o token JWT persistido no sessionStorage.
 *
 * O sessionStorage é limpo automaticamente pelo navegador ao fechar a aba,
 * garantindo que a sessão não persista entre visitas (BLUEPRINT §4).
 */
export function getAuthToken(): string | null {
  try {
    return window.sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Persiste o token JWT no sessionStorage.
 */
export function setAuthToken(token: string): void {
  try {
    window.sessionStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  } catch {
    /* storage indisponível — ignora silenciosamente */
  }
}

/**
 * Remove o token JWT do sessionStorage.
 */
export function clearAuthToken(): void {
  try {
    window.sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    /* storage indisponível — ignora silenciosamente */
  }
}

// ═══════════════════════════════════════════
// INSTÂNCIA AXIOS
// ═══════════════════════════════════════════

export const httpClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: HTTP_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Injeção automática do Bearer token em cada requisição.
httpClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = getAuthToken();

    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }

    return config;
  },
);

// Normalização de erros da API.
httpClient.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => response,
  (error: AxiosError<{ message?: string | string[] }>): Promise<never> => {
    const status = error.response?.status ?? 0;
    const rawMessage = error.response?.data?.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage.join(', ')
      : (rawMessage ??
        error.message ??
        'Erro inesperado na comunicação com a API.');

    return Promise.reject(new ApiError(message, status, error.config?.url));
  },
);

// ═══════════════════════════════════════════
// HELPERS TIPADOS
// ═══════════════════════════════════════════

async function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await httpClient.get<T>(url, config);
  return response.data;
}

async function post<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await httpClient.post<T>(url, body, config);
  return response.data;
}

async function patch<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await httpClient.patch<T>(url, body, config);
  return response.data;
}

async function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await httpClient.delete<T>(url, config);
  return response.data;
}

// ═══════════════════════════════════════════
// API TIPADA POR MÓDULO
// ═══════════════════════════════════════════

export const authApi = {
  login: (payload: LoginPayload): Promise<AuthResponse> =>
    post<AuthResponse>('/auth/login', payload),
  register: (payload: RegisterPayload): Promise<AuthResponse> =>
    post<AuthResponse>('/auth/register', payload),
  forgotPassword: (payload: { email: string }): Promise<{ message: string }> =>
    post<{ message: string }>('/auth/forgot-password', payload),
  resetPassword: (payload: { token: string; newPassword: string }): Promise<{ message: string }> =>
    post<{ message: string }>('/auth/reset-password', payload),
};

export const usersApi = {
  list: (): Promise<SafeUser[]> => get<SafeUser[]>('/users'),
  create: (payload: {
    name: string;
    email: string;
    password: string;
    role: Role;
    avatarColor: string;
  }): Promise<SafeUser> => post<SafeUser>('/users', payload),
  update: (
    id: string,
    payload: { name?: string; avatarColor?: string; role?: Role },
  ): Promise<SafeUser> => patch<SafeUser>(`/users/${id}`, payload),
  remove: (id: string): Promise<void> => del<void>(`/users/${id}`),
};

export const categoriesApi = {
  list: (): Promise<Category[]> => get<Category[]>('/categories'),
  create: (payload: {
    name: string;
    color: string;
    icon: string;
  }): Promise<Category> => post<Category>('/categories', payload),
  update: (
    id: string,
    payload: { name?: string; color?: string; icon?: string },
  ): Promise<Category> => patch<Category>(`/categories/${id}`, payload),
  remove: (id: string): Promise<void> => del<void>(`/categories/${id}`),
};

export const expensesApi = {
  list: (params?: {
    type?: ExpenseType;
    categoryId?: string;
    page?: number;
    limit?: number;
  }): Promise<Paginated<Expense>> =>
    get<Paginated<Expense>>('/expenses', { params }),
  getById: (id: string): Promise<ExpenseWithItems> =>
    get<ExpenseWithItems>(`/expenses/${id}`),
  create: (payload: {
    title: string;
    description?: string;
    type: ExpenseType;
    totalAmount: number;
    categoryId: string;
    dueDate: string;
    totalInstallments?: number;
  }): Promise<ExpenseWithItems> => post<ExpenseWithItems>('/expenses', payload),
  update: (
    id: string,
    payload: {
      title?: string;
      description?: string;
      categoryId?: string;
      totalAmount?: number;
    },
  ): Promise<Expense> => patch<Expense>(`/expenses/${id}`, payload),
  remove: (id: string): Promise<void> => del<void>(`/expenses/${id}`),
  restore: (id: string): Promise<Expense> =>
    post<Expense>(`/expenses/${id}/restore`),
  cancelRecurrence: (id: string): Promise<Expense> =>
    post<Expense>(`/expenses/${id}/cancel-recurrence`),
};

export const paymentItemsApi = {
  queue: (params?: {
    month?: number;
    year?: number;
    paidById?: string;
  }): Promise<PaymentQueue> =>
    get<PaymentQueue>('/payment-items/queue', { params }),
  history: (params?: {
    month?: number;
    year?: number;
    paidById?: string;
    categoryId?: string;
    page?: number;
    limit?: number;
  }): Promise<Paginated<PaymentItemWithPayer>> =>
    get<Paginated<PaymentItemWithPayer>>('/payment-items/history', { params }),
  pay: (id: string, payload: PayItemPayload): Promise<PaymentItemWithPayer> =>
    patch<PaymentItemWithPayer>(`/payment-items/${id}/pay`, payload),
  updateExpectedAmount: (
    id: string,
    expectedAmount: number,
  ): Promise<PaymentItem> =>
    patch<PaymentItem>(`/payment-items/${id}`, { expectedAmount }),
};

export const dashboardApi = {
  summary: (params: {
    month: number;
    year: number;
  }): Promise<DashboardSummary> =>
    get<DashboardSummary>('/dashboard/summary', { params }),
  categoryDistribution: (params: {
    month: number;
    year: number;
  }): Promise<CategoryDistribution[]> =>
    get<CategoryDistribution[]>('/dashboard/category-distribution', { params }),
  monthlyEvolution: (params: {
    year: number;
  }): Promise<MonthlyEvolution[]> =>
    get<MonthlyEvolution[]>('/dashboard/monthly-evolution', { params }),
};

export const notificationsApi = {
  subscribe: (payload: PushSubscriptionPayload): Promise<{ id: string }> =>
    post<{ id: string }>('/notifications/subscribe', payload),
  unsubscribe: (endpoint: string): Promise<void> =>
    del<void>('/notifications/subscribe', { data: { endpoint } }),
};

/**
 * Suporte ao cliente via Telegram (TAREFA 20 / TAREFA 21 / RN-14).
 * O backend é o único que fala com a API do Telegram.
 */
export const supportApi = {
  send: (payload: SupportMessagePayload): Promise<SupportMessageResult> =>
    post<SupportMessageResult>('/support', payload),
};

/**
 * Barrel de conveniência — acesso unificado à API tipada.
 */
export const api = {
  auth: authApi,
  users: usersApi,
  categories: categoriesApi,
  expenses: expensesApi,
  paymentItems: paymentItemsApi,
  dashboard: dashboardApi,
  notifications: notificationsApi,
  support: supportApi,
};
