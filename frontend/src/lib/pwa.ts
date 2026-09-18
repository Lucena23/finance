/**
 * pwa.ts — Registro, ciclo de vida e utilitários PWA do Finanças Aksurim.
 *
 * Responsabilidades:
 *  - TAREFA 48: registro do Service Worker, tratamento de atualizações e
 *    utilitários de suporte ao ciclo de vida do worker.
 *  - TAREFA 49: fluxo de instalação (beforeinstallprompt) e registro de
 *    subscription de Web Push (permissão + pushManager.subscribe + envio
 *    para POST /notifications/subscribe).
 *
 * O arquivo do Service Worker (`/service-worker.js`) é gerado a partir de
 * `src/service-worker.ts` pelo script `scripts/build-service-worker.mjs`
 * durante o build.
 *
 * REGRA (§8.1): TypeScript strict, sem uso de `any`.
 */

import { notificationsApi, type PushSubscriptionPayload } from './api';

/** Caminho público do Service Worker (raiz do escopo). */
export const SERVICE_WORKER_URL = '/service-worker.js';

/**
 * Chave pública VAPID (base64url) usada pelo navegador para criar a
 * subscription de Web Push. Injetada em build-time via VITE_VAPID_PUBLIC_KEY.
 */
export const VAPID_PUBLIC_KEY: string =
  import.meta.env.VITE_VAPID_PUBLIC_KEY ?? '';

// ═══════════════════════════════════════════
// SUPORTE E REGISTRO DO SERVICE WORKER
// ═══════════════════════════════════════════

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
export type UpdateAvailableHandler = (
  registration: ServiceWorkerRegistration,
) => void;

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

/**
 * Aguarda o Service Worker estar pronto (ativo e controlando a página).
 *
 * @returns A registration ativa, ou `null` se indisponível.
 */
export async function getReadyServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) {
    return null;
  }

  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════
// INSTALAÇÃO PWA (beforeinstallprompt)
// ═══════════════════════════════════════════

/**
 * Evento `beforeinstallprompt` (não presente na lib DOM padrão do TS).
 * Capturado para permitir a instalação da PWA sob demanda pelo usuário.
 */
export interface BeforeInstallPromptEvent extends Event {
  /** Exibe o prompt nativo de instalação. */
  prompt: () => Promise<void>;
  /** Resultado da escolha do usuário no prompt. */
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

/**
 * Verifica se a aplicação está rodando em modo standalone (já instalada).
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const navigatorWithStandalone = window.navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    navigatorWithStandalone.standalone === true
  );
}

/**
 * Verifica se o ambiente suporta o fluxo de instalação PWA.
 */
export function isInstallSupported(): boolean {
  return typeof window !== 'undefined' && 'BeforeInstallPromptEvent' in window;
}

// ═══════════════════════════════════════════
// WEB PUSH — PERMISSÃO E SUBSCRIPTION
// ═══════════════════════════════════════════

/** Estado normalizado da permissão de notificação. */
export type PushPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

/**
 * Verifica se o ambiente suporta Web Push (Service Worker + PushManager +
 * Notification API).
 */
export function isPushSupported(): boolean {
  return (
    isServiceWorkerSupported() &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Retorna o estado atual da permissão de notificação do navegador.
 */
export function getPushPermissionState(): PushPermissionState {
  if (!isPushSupported()) {
    return 'unsupported';
  }

  return Notification.permission;
}

/**
 * Converte a chave pública VAPID (base64url) para o ArrayBuffer exigido por
 * `pushManager.subscribe({ applicationServerKey })`.
 *
 * Retorna um `ArrayBuffer` (e não `Uint8Array`) para satisfazer o tipo
 * `BufferSource` do DOM sem conflito com `SharedArrayBuffer` (TS 5.7+).
 *
 * @param base64String Chave pública VAPID em base64url.
 * @returns ArrayBuffer da chave, ou null se a entrada for inválida.
 */
export function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer | null {
  if (!base64String) {
    return null;
  }

  try {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const buffer = new ArrayBuffer(rawData.length);
    const view = new Uint8Array(buffer);

    for (let i = 0; i < rawData.length; i += 1) {
      view[i] = rawData.charCodeAt(i);
    }

    return buffer;
  } catch {
    return null;
  }
}

/**
 * Converte uma PushSubscription do navegador no payload aceito pela API
 * (POST /notifications/subscribe — ARCHITECTURE §3.2).
 *
 * @param subscription Subscription obtida via pushManager.subscribe.
 * @returns Payload tipado, ou null se as chaves estiverem ausentes.
 */
export function toPushSubscriptionPayload(
  subscription: PushSubscription,
): PushSubscriptionPayload | null {
  const json = subscription.toJSON();
  const keys = json.keys;

  if (!json.endpoint || !keys?.p256dh || !keys.auth) {
    return null;
  }

  return {
    endpoint: json.endpoint,
    keys: {
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
  };
}

/**
 * Resultado do fluxo de ativação de notificações push.
 */
export interface EnablePushResult {
  /** Indica se a subscription foi criada e registrada com sucesso. */
  success: boolean;
  /** Estado final da permissão de notificação. */
  permission: PushPermissionState;
  /** Mensagem legível em caso de falha. */
  error?: string;
}

/**
 * Solicita permissão de notificação, cria a subscription de Web Push no
 * navegador e a registra no backend (POST /notifications/subscribe).
 *
 * Trata explicitamente o cenário de permissão negada (TAREFA 49).
 *
 * @returns Resultado do fluxo com estado final da permissão.
 */
export async function enablePushNotifications(): Promise<EnablePushResult> {
  if (!isPushSupported()) {
    return {
      success: false,
      permission: 'unsupported',
      error: 'Este navegador não suporta notificações push.',
    };
  }

  if (!VAPID_PUBLIC_KEY) {
    return {
      success: false,
      permission: getPushPermissionState(),
      error: 'Chave pública VAPID não configurada no frontend.',
    };
  }

  // 1. Solicita permissão de notificação.
  const permission = await Notification.requestPermission();

  if (permission !== 'granted') {
    return {
      success: false,
      permission,
      error:
        permission === 'denied'
          ? 'Permissão de notificação negada. Habilite nas configurações do navegador.'
          : 'Permissão de notificação não concedida.',
    };
  }

  // 2. Obtém o Service Worker ativo.
  const registration = await getReadyServiceWorker();

  if (!registration) {
    return {
      success: false,
      permission,
      error: 'Service Worker indisponível para registrar a subscription.',
    };
  }

  const applicationServerKey = urlBase64ToArrayBuffer(VAPID_PUBLIC_KEY);

  if (!applicationServerKey) {
    return {
      success: false,
      permission,
      error: 'Chave pública VAPID inválida.',
    };
  }

  try {
    // 3. Cria (ou reutiliza) a subscription de push no navegador.
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      }));

    // 4. Envia a subscription para o backend.
    const payload = toPushSubscriptionPayload(subscription);

    if (!payload) {
      return {
        success: false,
        permission,
        error: 'Não foi possível extrair as chaves da subscription.',
      };
    }

    await notificationsApi.subscribe(payload);

    return { success: true, permission };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Falha ao registrar a subscription de push.';

    return { success: false, permission, error: message };
  }
}

/**
 * Remove a subscription de Web Push do navegador e do backend
 * (DELETE /notifications/subscribe).
 *
 * @returns true se a remoção foi concluída (ou não havia subscription).
 */
export async function disablePushNotifications(): Promise<boolean> {
  if (!isPushSupported()) {
    return false;
  }

  const registration = await getReadyServiceWorker();

  if (!registration) {
    return false;
  }

  try {
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      return true;
    }

    // Remove no backend antes de cancelar localmente (endpoint ainda válido).
    await notificationsApi.unsubscribe(subscription.endpoint);
    await subscription.unsubscribe();

    return true;
  } catch (error) {
    console.error('Falha ao remover a subscription de push:', error);
    return false;
  }
}

/**
 * Verifica se o navegador já possui uma subscription de push ativa.
 */
export async function hasActivePushSubscription(): Promise<boolean> {
  if (!isPushSupported()) {
    return false;
  }

  const registration = await getReadyServiceWorker();

  if (!registration) {
    return false;
  }

  try {
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch {
    return false;
  }
}
