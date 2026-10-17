/**
 * AuthContext.tsx — Contexto global de autenticação do Finanças Aksurim.
 *
 * Responsabilidades:
 *  - Persistir o token JWT e o usuário autenticado no sessionStorage.
 *  - Expor as operações login / register / logout.
 *  - Restaurar a sessão a partir do storage no bootstrap da aplicação.
 *  - Disponibilizar o estado de carregamento (isLoading) para que as rotas
 *    protegidas aguardem a hidratação antes de decidir redirecionar.
 *
 * TAREFA 9: A persistência migrou de `localStorage` para `sessionStorage`.
 * Ao fechar a aba/navegador, a sessão é encerrada automaticamente — o
 * usuário NÃO permanece logado ao retornar (BLUEPRINT §4).
 *
 * TAREFA 10: O logout agora invalida a sessão (token + usuário) E limpa o
 * estado local de Web Push (subscription do navegador + registro no backend),
 * evitando que o dispositivo continue recebendo notificações de um usuário
 * que encerrou a sessão. A limpeza de push é executada ANTES de remover o
 * token, pois a remoção no backend exige o JWT ainda válido.
 *
 * NOTA SOBRE WEB PUSH: A subscription de Web Push é mantida pelo navegador
 * no `pushManager` do Service Worker (persistente, independente do storage
 * de sessão). A migração para `sessionStorage` NÃO causa regressão nas
 * subscriptions: o registro no backend permanece válido e o navegador segue
 * entregando eventos `push` ao Service Worker mesmo com a aba fechada.
 *
 * REGRA (§8.1): proibido o uso de `any`. Todos os tipos são explícitos.
 */

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  ApiError,
  authApi,
  clearAuthToken,
  getAuthToken,
  setAuthToken,
  type AuthResponse,
  type LoginPayload,
  type RegisterPayload,
  type SafeUser,
} from '@/lib/api';
import {
  AUTH_LAST_ACTIVITY_STORAGE_KEY,
  AUTH_USER_STORAGE_KEY,
  SESSION_IDLE_TIMEOUT_MS,
} from '@/lib/constants';
import { clearLocalPushState } from '@/lib/pwa';

/**
 * Contrato público do contexto de autenticação.
 */
export interface AuthContextValue {
  /** Usuário autenticado, ou null quando não há sessão ativa. */
  user: SafeUser | null;
  /** Token JWT corrente, ou null quando não autenticado. */
  token: string | null;
  /** Indica se há uma sessão válida (token + usuário presentes). */
  isAuthenticated: boolean;
  /** Indica se a sessão inicial ainda está sendo hidratada do storage. */
  isLoading: boolean;
  /** Autentica um usuário existente. Lança ApiError em caso de falha. */
  login: (payload: LoginPayload) => Promise<SafeUser>;
  /** Cria FamilyAccount + ADMIN e autentica automaticamente. */
  register: (payload: RegisterPayload) => Promise<SafeUser>;
  /** Encerra a sessão, limpando token, usuário e estado local de push. */
  logout: () => Promise<void>;
}

/**
 * Contexto de autenticação. Inicializado como null para forçar o consumo
 * exclusivo via hook `useAuth`, que valida a presença do Provider.
 */
export const AuthContext = createContext<AuthContextValue | null>(null);

// ═══════════════════════════════════════════
// PERSISTÊNCIA DO USUÁRIO E HIGIENE DE SESSÃO (TAREFA 9 + SEGURANÇA FINTECH)
// ═══════════════════════════════════════════

/**
 * Verifica se o JWT possui claim `exp` expirada.
 * Tokens sintéticos de testes unitários (sem 3 segmentos base64) são aceitos.
 */
function isJwtExpired(jwtToken: string): boolean {
  try {
    const parts = jwtToken.split('.');
    if (parts.length !== 3 || !parts[1]) {
      return false;
    }

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      '=',
    );
    const decoded = JSON.parse(window.atob(padded)) as { exp?: unknown };

    if (typeof decoded.exp === 'number') {
      return Date.now() >= decoded.exp * 1000;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Verifica se a sessão excedeu o limite máximo de inatividade (30 min).
 */
function isSessionIdleExpired(): boolean {
  try {
    const raw = window.sessionStorage.getItem(AUTH_LAST_ACTIVITY_STORAGE_KEY);
    if (!raw) {
      return false;
    }
    const lastActivity = Number(raw);
    if (!Number.isFinite(lastActivity) || lastActivity <= 0) {
      return false;
    }
    return Date.now() - lastActivity > SESSION_IDLE_TIMEOUT_MS;
  } catch {
    return false;
  }
}

/**
 * Atualiza o carimbo de última atividade do usuário no sessionStorage.
 */
function touchLastActivity(): void {
  try {
    window.sessionStorage.setItem(
      AUTH_LAST_ACTIVITY_STORAGE_KEY,
      String(Date.now()),
    );
  } catch {
    /* storage indisponível — ignora silenciosamente */
  }
}

/**
 * Remove o carimbo de última atividade do sessionStorage.
 */
function clearLastActivity(): void {
  try {
    window.sessionStorage.removeItem(AUTH_LAST_ACTIVITY_STORAGE_KEY);
  } catch {
    /* storage indisponível — ignora silenciosamente */
  }
}

/**
 * Recupera o usuário persistido no sessionStorage, validando o formato mínimo.
 */
function readStoredUser(): SafeUser | null {
  try {
    const raw = window.sessionStorage.getItem(AUTH_USER_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'id' in parsed &&
      'email' in parsed &&
      'familyAccountId' in parsed
    ) {
      return parsed as SafeUser;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Persiste o usuário autenticado no sessionStorage.
 */
function writeStoredUser(user: SafeUser): void {
  try {
    window.sessionStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
  } catch {
    /* storage indisponível — ignora silenciosamente */
  }
}

/**
 * Remove o usuário persistido do sessionStorage.
 */
function clearStoredUser(): void {
  try {
    window.sessionStorage.removeItem(AUTH_USER_STORAGE_KEY);
  } catch {
    /* storage indisponível — ignora silenciosamente */
  }
}

// ═══════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider — injeta o estado de autenticação em toda a árvore React.
 */
export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const clearSessionSilently = useCallback((): void => {
    clearAuthToken();
    clearStoredUser();
    clearLastActivity();
    setToken(null);
    setUser(null);
  }, []);

  // Hidratação inicial: restaura token + usuário do storage se não expirados.
  useEffect(() => {
    const storedToken = getAuthToken();
    const storedUser = readStoredUser();

    if (
      storedToken &&
      storedUser &&
      !isJwtExpired(storedToken) &&
      !isSessionIdleExpired()
    ) {
      touchLastActivity();
      setToken(storedToken);
      setUser(storedUser);
    } else {
      // Estado inconsistente ou sessão expirada (JWT vencido / inatividade > 30m) → limpa tudo.
      clearSessionSilently();
    }

    setIsLoading(false);
  }, [clearSessionSilently]);

  // Monitoramento contínuo de inatividade (30 min), expiração do JWT e HTTP 401.
  useEffect(() => {
    if (!token || !user) {
      return;
    }

    let lastWrite = Date.now();

    const handleUserActivity = (): void => {
      const now = Date.now();
      if (now - lastWrite >= 15_000) {
        lastWrite = now;
        touchLastActivity();
      }
    };

    const checkSessionValidity = (): void => {
      if (isJwtExpired(token) || isSessionIdleExpired()) {
        clearSessionSilently();
      } else if (document.visibilityState === 'visible') {
        touchLastActivity();
      }
    };

    const handleAuthExpired = (): void => {
      clearSessionSilently();
    };

    window.addEventListener('pointerdown', handleUserActivity, {
      passive: true,
    });
    window.addEventListener('keydown', handleUserActivity, { passive: true });
    window.addEventListener('touchstart', handleUserActivity, {
      passive: true,
    });
    window.addEventListener('scroll', handleUserActivity, { passive: true });
    window.addEventListener('focus', checkSessionValidity);
    document.addEventListener('visibilitychange', checkSessionValidity);
    window.addEventListener('auth-expired', handleAuthExpired);

    const intervalId = window.setInterval(() => {
      if (isJwtExpired(token) || isSessionIdleExpired()) {
        clearSessionSilently();
      }
    }, 60_000);

    return () => {
      window.removeEventListener('pointerdown', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      window.removeEventListener('focus', checkSessionValidity);
      document.removeEventListener('visibilitychange', checkSessionValidity);
      window.removeEventListener('auth-expired', handleAuthExpired);
      window.clearInterval(intervalId);
    };
  }, [token, user, clearSessionSilently]);

  /**
   * Aplica o resultado de uma autenticação bem-sucedida ao estado e storage.
   */
  const applyAuthResponse = useCallback((response: AuthResponse): SafeUser => {
    setAuthToken(response.accessToken);
    writeStoredUser(response.user);
    touchLastActivity();
    setToken(response.accessToken);
    setUser(response.user);

    return response.user;
  }, []);

  const login = useCallback(
    async (payload: LoginPayload): Promise<SafeUser> => {
      const response = await authApi.login(payload);
      return applyAuthResponse(response);
    },
    [applyAuthResponse],
  );

  const register = useCallback(
    async (payload: RegisterPayload): Promise<SafeUser> => {
      const response = await authApi.register(payload);
      return applyAuthResponse(response);
    },
    [applyAuthResponse],
  );

  /**
   * TAREFA 10 — Logout completo.
   *
   * Ordem de execução (importante):
   *  1. Limpa o estado local de Web Push (subscription do navegador + registro
   *     no backend) ENQUANTO o token ainda está presente — a remoção no backend
   *     (DELETE /notifications/subscribe) exige o JWT válido.
   *  2. Invalida a sessão: remove token + usuário do sessionStorage e zera o
   *     estado React.
   *
   * A limpeza de push é tolerante a falhas e nunca impede o encerramento da
   * sessão (ver `clearLocalPushState` em `@/lib/pwa`).
   */
  const logout = useCallback(async (): Promise<void> => {
    // 1. Limpa o estado local de push antes de invalidar o token.
    await clearLocalPushState();

    // 2. Invalida a sessão (token + usuário + atividade).
    clearSessionSilently();
  }, [clearSessionSilently]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isLoading,
      login,
      register,
      logout,
    }),
    [user, token, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Reexporta ApiError para conveniência dos consumidores do contexto,
 * permitindo tratamento tipado de erros de autenticação sem importar
 * diretamente do módulo de API.
 */
export { ApiError };
