/**
 * pwa.ts — Registro e ciclo de vida do Service Worker (TAREFA 48).
 *
 * Encapsula o registro do Service Worker PWA, o tratamento de atualizações
 * (nova versão disponível) e utilitários de suporte. O arquivo do Service
 * Worker (`/service-worker.js`) é gerado a partir de `src/service-worker.ts`
 * pelo script `scripts/build-service-worker.mjs` durante o build.
 *
 * REGRA (§8.1): TypeScript strict, sem uso de `any`.
 */

/** Caminho público do Service Worker (raiz do escopo). */
export const SERVICE_WORKER_URL = '/service-worker.js';

/**
 * Verifica se o ambiente atual suporta Service Workers.
 */
export function isServiceWorkerSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    window.isSecureContext
  );
}

/**
 * Callback invocado quando uma nova versão do Service Worker é instalada
 * e está aguardando ativação.
 */
export type UpdateAvailableHandler = (registration: ServiceWorkerRegistration) => void;

/**
 * Registra o Service Worker da aplicação.
 *
 * @param onUpdateAvailable Callback opcional disparado quando há uma nova
 *   versão pronta para ativar (ex: exibir toast "Nova versão disponível").
 * @returns A registration do Service Worker, ou `null` se não suportado.
 */
export async function registerServiceWorker(
  onUpdateAvailable?: UpdateAvailableHandler,
): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(
      SERVICE_WORKER_URL,
      { scope: '/' },
    );

    // Detecta atualizações em instalações subsequentes.
    registration.addEventListener('updatefound', () => {
      const installingWorker = registration.installing;

      if (!installingWorker) {
        return;
      }

      installingWorker.addEventListener('statechange', () => {
        const hasController = navigator.serviceWorker.controller !== null;

        if (
          installingWorker.state === 'installed' &&
          hasController &&
          onUpdateAvailable
        ) {
          onUpdateAvailable(registration);
        }
      });
    });

    return registration;
  } catch (error) {
    // Falha de registro não deve quebrar a aplicação.
    console.error('Falha ao registrar o Service Worker:', error);
    return null;
  }
}

/**
 * Força a ativação imediata de uma nova versão do Service Worker e recarrega
 * a página quando o novo worker assume o controle.
 *
 * @param registration Registration obtida em `registerServiceWorker`.
 */
export function activateServiceWorkerUpdate(
  registration: ServiceWorkerRegistration,
): void {
  const waitingWorker = registration.waiting;

  if (!waitingWorker) {
    return;
  }

  // Recarrega a página assim que o novo worker assumir o controle.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });

  waitingWorker.postMessage({ type: 'SKIP_WAITING' });
}
