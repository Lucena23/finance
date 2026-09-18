/**
 * AuthContext.tsx — Contexto global de autenticação do Finanças Aksurim.
 *
 * Responsabilidades (TAREFA 35):
 *  - Persistir o token JWT e o usuário autenticado no localStorage.
 *  - Expor as operações login / register / logout.
 *  - Restaurar a sessão a partir do storage no bootstrap da aplicação.
 *  - Disponibilizar o estado de carregamento (isLoading) para que as rotas
 *    protegidas aguardem a hidratação antes de decidir redirecionar.
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
import { AUTH_USER_STORAGE_KEY } from '@/lib/constants';

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
  /** Encerra a sessão, limpando token e usuário do storage. */
  logout: () => void;
}

/**
 * Contexto de autenticação. Inicializado como null para forçar o consumo
 * exclusivo via hook `useAuth`, que valida a presença do Provider.
 */
export const AuthContext = createContext<AuthContextValue | null>(null);

// ═══════════════════════════════════════════
// PERSISTÊNCIA DO USUÁRIO
// ═══════════════════════════════════════════

/**
 * Recupera o usuário persistido no localStorage, validando o formato mínimo.
 */
function readStoredUser(): SafeUser | null {
  try {
    const raw = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);

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
 * Persiste o usuário autenticado no localStorage.
 */
function writeStoredUser(user: SafeUser): void {
  try {
    window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
  } catch {
    /* storage indisponível — ignora silenciosamente */
  }
}

/**
 * Remove o usuário persistido do localStorage.
 */
function clearStoredUser(): void {
  try {
    window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
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

  // Hidratação inicial: restaura token + usuário do storage.
  useEffect(() => {
    const storedToken = getAuthToken();
    const storedUser = readStoredUser();

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
    } else {
      // Estado inconsistente (token sem usuário ou vice-versa) → limpa tudo.
      clearAuthToken();
      clearStoredUser();
    }

    setIsLoading(false);
  }, []);

  /**
   * Aplica o resultado de uma autenticação bem-sucedida ao estado e storage.
   */
  const applyAuthResponse = useCallback((response: AuthResponse): SafeUser => {
    setAuthToken(response.accessToken);
    writeStoredUser(response.user);
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

  const logout = useCallback((): void => {
    clearAuthToken();
    clearStoredUser();
    setToken(null);
    setUser(null);
  }, []);

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
