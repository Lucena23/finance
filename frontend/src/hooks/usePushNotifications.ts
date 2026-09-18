/**
 * usePushNotifications.ts — Hook de Web Push Notifications (TAREFA 49).
 *
 * Encapsula o fluxo de ativação/desativação de notificações push:
 *  - Verifica suporte do navegador e estado da permissão.
 *  - Solicita permissão, cria a subscription e a registra no backend
 *    (POST /notifications/subscribe).
 *  - Remove a subscription no backend e no navegador
 *    (DELETE /notifications/subscribe).
 *  - Trata explicitamente o cenário de permissão negada.
 *
 * REGRA (§8.1): proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import { useCallback, useEffect, useState } from 'react';

import {
  disablePushNotifications,
  enablePushNotifications,
  getPushPermissionState,
  hasActivePushSubscription,
  isPushSupported,
  type PushPermissionState,
} from '@/lib/pwa';

/**
 * Estado e operações expostos pelo hook usePushNotifications.
 */
export interface UsePushNotificationsResult {
  /** Indica se o navegador suporta Web Push. */
  isSupported: boolean;
  /** Estado atual da permissão de notificação. */
  permission: PushPermissionState;
  /** Indica se há uma subscription de push ativa no navegador. */
  isSubscribed: boolean;
  /** Indica se uma operação de ativação/desativação está em andamento. */
  isProcessing: boolean;
  /** Mensagem de erro legível da última operação, ou null. */
  error: string | null;
  /** Ativa as notificações push (permissão + subscription + registro). */
  enable: () => Promise<boolean>;
  /** Desativa as notificações push (remoção no backend e no navegador). */
  disable: () => Promise<boolean>;
  /** Limpa o erro corrente. */
  clearError: () => void;
}

/**
 * Gerencia o ciclo de vida das notificações push do usuário autenticado.
 *
 * @returns Estado de suporte/permissão/subscription e ações enable/disable.
 *
 * @example
 * const { isSupported, isSubscribed, enable, disable } = usePushNotifications();
 */
export function usePushNotifications(): UsePushNotificationsResult {
  const [permission, setPermission] = useState<PushPermissionState>(() =>
    getPushPermissionState(),
  );
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isSupported = isPushSupported();

  // Sincroniza o estado inicial da subscription ao montar.
  useEffect(() => {
    let isMounted = true;

    void (async (): Promise<void> => {
      const active = await hasActivePushSubscription();

      if (isMounted) {
        setIsSubscribed(active);
        setPermission(getPushPermissionState());
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  const enable = useCallback(async (): Promise<boolean> => {
    setIsProcessing(true);
    setError(null);

    try {
      const result = await enablePushNotifications();

      setPermission(result.permission);

      if (!result.success) {
        setError(result.error ?? 'Não foi possível ativar as notificações.');
        setIsSubscribed(false);
        return false;
      }

      setIsSubscribed(true);
      return true;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const disable = useCallback(async (): Promise<boolean> => {
    setIsProcessing(true);
    setError(null);

    try {
      const success = await disablePushNotifications();

      if (!success) {
        setError('Não foi possível desativar as notificações.');
        return false;
      }

      setIsSubscribed(false);
      setPermission(getPushPermissionState());
      return true;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    isSupported,
    permission,
    isSubscribed,
    isProcessing,
    error,
    enable,
    disable,
    clearError,
  };
}
