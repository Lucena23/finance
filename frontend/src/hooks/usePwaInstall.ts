/**
 * usePwaInstall.ts — Hook do fluxo de instalação da PWA (TAREFA 49).
 *
 * Captura o evento `beforeinstallprompt`, expõe a disponibilidade do prompt
 * de instalação e dispara a instalação sob demanda do usuário. Também detecta
 * quando a aplicação já está instalada (modo standalone) e quando o evento
 * `appinstalled` é disparado.
 *
 * REGRA (§8.1): proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import { useCallback, useEffect, useState } from 'react';

import {
  isStandalone,
  type BeforeInstallPromptEvent,
} from '@/lib/pwa';

/**
 * Estado e operações expostos pelo hook usePwaInstall.
 */
export interface UsePwaInstallResult {
  /** Indica se o prompt nativo de instalação está disponível. */
  canInstall: boolean;
  /** Indica se a aplicação já está instalada (modo standalone). */
  isInstalled: boolean;
  /** Dispara o prompt nativo de instalação. Retorna o resultado da escolha. */
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

/**
 * Gerencia o fluxo de instalação da PWA na tela inicial.
 *
 * @returns Disponibilidade do prompt, estado de instalação e ação de instalar.
 *
 * @example
 * const { canInstall, isInstalled, promptInstall } = usePwaInstall();
 */
export function usePwaInstall(): UsePwaInstallResult {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => isStandalone());

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event): void => {
      // Impede o mini-infobar automático e guarda o evento para uso sob demanda.
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = (): void => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt,
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<
    'accepted' | 'dismissed' | 'unavailable'
  > => {
    if (!deferredPrompt) {
      return 'unavailable';
    }

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    // O evento só pode ser usado uma vez — descarta após o prompt.
    setDeferredPrompt(null);

    return outcome;
  }, [deferredPrompt]);

  return {
    canInstall: deferredPrompt !== null && !isInstalled,
    isInstalled,
    promptInstall,
  };
}
