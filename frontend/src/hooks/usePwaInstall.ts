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
  /** Indica se o prompt nativo de instalação (1 clique) está disponível. */
  canInstall: boolean;
  /** Indica se a aplicação já está instalada (modo standalone). */
  isInstalled: boolean;
  /** Dispara o prompt nativo de instalação. Retorna o resultado da escolha. */
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

// Captura global do evento `beforeinstallprompt` desde o boot da aplicação
// para não perder o disparo caso o usuário navegue da LandingPage para /login ou /register.
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<() => void>();

function notifyPromptListeners(): void {
  for (const listener of promptListeners) {
    listener();
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event: Event) => {
    event.preventDefault();
    globalDeferredPrompt = event as BeforeInstallPromptEvent;
    notifyPromptListeners();
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    notifyPromptListeners();
  });
}

/**
 * Gerencia o fluxo de instalação da PWA na tela inicial.
 */
export function usePwaInstall(): UsePwaInstallResult {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(() => globalDeferredPrompt);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => isStandalone());

  useEffect(() => {
    const syncState = (): void => {
      setDeferredPrompt(globalDeferredPrompt);
      if (isStandalone() || globalDeferredPrompt === null) {
        setIsInstalled(isStandalone());
      }
    };

    const handleAppInstalled = (): void => {
      globalDeferredPrompt = null;
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    promptListeners.add(syncState);
    window.addEventListener('appinstalled', handleAppInstalled);
    syncState();

    return () => {
      promptListeners.delete(syncState);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<
    'accepted' | 'dismissed' | 'unavailable'
  > => {
    const activePrompt = deferredPrompt ?? globalDeferredPrompt;
    if (!activePrompt) {
      return 'unavailable';
    }

    await activePrompt.prompt();
    const { outcome } = await activePrompt.userChoice;

    globalDeferredPrompt = null;
    setDeferredPrompt(null);
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }

    return outcome;
  }, [deferredPrompt]);

  return {
    canInstall: (deferredPrompt ?? globalDeferredPrompt) !== null && !isInstalled,
    isInstalled,
    promptInstall,
  };
}
