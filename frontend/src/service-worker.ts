/**
 * service-worker.ts — Service Worker PWA do Finanças Aksurim (TAREFA 48).
 *
 * Responsabilidades:
 *  1. Cache de shell (app shell) para funcionamento offline básico.
 *  2. Estratégia de fetch: network-first para navegação (fallback para o
 *     shell em cache quando offline) e cache-first para assets estáticos
 *     hasheados (imutáveis).
 *  3. Invalidação de cache em nova versão (versionamento por CACHE_VERSION).
 *  4. Listener do evento `push` exibindo Web Push Notification (RN-10 / §8.6).
 *  5. Listener de `notificationclick` para focar/abrir a aplicação.
 *
 * Este arquivo é compilado de TypeScript para JavaScript puro e publicado na
 * raiz do diretório público (escopo global do Service Worker) pelo script
 * `scripts/build-service-worker.mjs`, executado no `npm run build`.
 *
 * REGRA (§8.1): TypeScript strict, sem uso de `any`.
 */

/// <reference lib="webworker" />

export {};

// ═══════════════════════════════════════════
// TIPAGEM DO ESCOPO DO SERVICE WORKER
// ═══════════════════════════════════════════

declare const self: ServiceWorkerGlobalScope;

// ═══════════════════════════════════════════
// CONSTANTES DE CACHE
// ═══════════════════════════════════════════

/**
 * Versão do cache. Incrementar este valor invalida todos os caches antigos
 * na ativação do novo Service Worker (cache busting de shell).
 */
const CACHE_VERSION = 'v1';

/** Nome do cache do app shell (HTML, manifest, ícones). */
const SHELL_CACHE = `aksurim-shell-${CACHE_VERSION}`;

/** Nome do cache de assets estáticos hasheados (imutáveis). */
const ASSETS_CACHE = `aksurim-assets-${CACHE_VERSION}`;

/** Lista de caches gerenciados por esta versão do Service Worker. */
const MANAGED_CACHES: readonly string[] = [SHELL_CACHE, ASSETS_CACHE];

/**
 * Recursos mínimos do app shell pré-cacheados na instalação.
 * O `index.html` é a rota de fallback para navegação offline (SPA).
 */
const SHELL_ASSETS: readonly string[] = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

/** Ícone padrão das notificações push. */
const NOTIFICATION_ICON = '/icons/icon-192x192.png';

/** Ícone de badge das notificações push. */
const NOTIFICATION_BADGE = '/icons/icon-192x192.png';

// ═══════════════════════════════════════════
// TIPOS AUXILIARES
// ═══════════════════════════════════════════

/**
 * Payload esperado no evento `push` (enviado pelo backend via web-push).
 * Campos opcionais para tolerar payloads parciais.
 */
interface PushPayload {
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    url?: string;
    [key: string]: unknown;
  };
}

// ═══════════════════════════════════════════
// INSTALAÇÃO — PRÉ-CACHE DO APP SHELL
// ═══════════════════════════════════════════

self.addEventListener('install', (event: ExtendableEvent): void => {
  event.waitUntil(
    (async (): Promise<void> => {
      const cache = await caches.open(SHELL_CACHE);

      // Pré-cache resiliente: falha de um recurso individual não aborta a
      // instalação inteira (evita travar o SW por um asset ausente).
      await Promise.all(
        SHELL_ASSETS.map(async (asset): Promise<void> => {
          try {
            await cache.add(new Request(asset, { cache: 'reload' }));
          } catch {
            /* recurso indisponível no momento do install — ignorado */
          }
        }),
      );

      // Ativa imediatamente a nova versão do SW.
      await self.skipWaiting();
    })(),
  );
});

// ═══════════════════════════════════════════
// ATIVAÇÃO — LIMPEZA DE CACHES ANTIGOS
// ═══════════════════════════════════════════

self.addEventListener('activate', (event: ExtendableEvent): void => {
  event.waitUntil(
    (async (): Promise<void> => {
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames
          .filter((name) => !MANAGED_CACHES.includes(name))
          .map((name) => caches.delete(name)),
      );

      // Assume o controle das páginas abertas sem exigir reload manual.
      await self.clients.claim();
    })(),
  );
});

// ═══════════════════════════════════════════
// FETCH — ESTRATÉGIAS DE CACHE
// ═══════════════════════════════════════════

/**
 * Verifica se a requisição é para um asset estático hasheado (imutável),
 * candidato à estratégia cache-first.
 */
function isStaticAsset(url: URL): boolean {
  return (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    /\.(?:css|js|png|jpg|jpeg|svg|webp|woff2?|ico)$/i.test(url.pathname)
  );
}

/**
 * Verifica se a requisição é uma navegação de documento (SPA).
 */
function isNavigationRequest(request: Request): boolean {
  return (
    request.mode === 'navigate' ||
    (request.method === 'GET' &&
      request.headers.get('accept')?.includes('text/html') === true)
  );
}

self.addEventListener('fetch', (event: FetchEvent): void => {
  const { request } = event;

  // Apenas requisições GET são elegíveis para cache.
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Ignora requisições cross-origin (ex: API em outro domínio) e a API REST.
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  // Navegação (SPA): network-first com fallback para o shell em cache.
  if (isNavigationRequest(request)) {
    event.respondWith(
      (async (): Promise<Response> => {
        try {
          const networkResponse = await fetch(request);

          const cache = await caches.open(SHELL_CACHE);
          await cache.put('/index.html', networkResponse.clone());

          return networkResponse;
        } catch {
          const cache = await caches.open(SHELL_CACHE);
          const cachedShell =
            (await cache.match('/index.html')) ?? (await cache.match('/'));

          return (
            cachedShell ??
            new Response('Aplicação indisponível offline.', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            })
          );
        }
      })(),
    );
    return;
  }

  // Assets estáticos hasheados: cache-first com preenchimento do cache.
  if (isStaticAsset(url)) {
    event.respondWith(
      (async (): Promise<Response> => {
        const cache = await caches.open(ASSETS_CACHE);
        const cached = await cache.match(request);

        if (cached) {
          return cached;
        }

        try {
          const networkResponse = await fetch(request);

          if (networkResponse.ok) {
            await cache.put(request, networkResponse.clone());
          }

          return networkResponse;
        } catch {
          return new Response('Recurso indisponível offline.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        }
      })(),
    );
  }
});

// ═══════════════════════════════════════════
// PUSH — EXIBIÇÃO DE NOTIFICAÇÃO
// ═══════════════════════════════════════════

/**
 * Extrai o payload JSON do evento push de forma segura.
 */
function parsePushPayload(event: PushEvent): PushPayload {
  if (!event.data) {
    return {};
  }

  try {
    const parsed: unknown = event.data.json();

    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as PushPayload;
    }

    return {};
  } catch {
    // Payload não-JSON: usa o texto bruto como corpo da notificação.
    try {
      return { body: event.data.text() };
    } catch {
      return {};
    }
  }
}

self.addEventListener('push', (event: PushEvent): void => {
  const payload = parsePushPayload(event);

  const title = payload.title ?? 'Finanças Aksurim';
  const body =
    payload.body ?? 'Você possui compromissos financeiros pendentes.';

  const options: NotificationOptions = {
    body,
    icon: payload.icon ?? NOTIFICATION_ICON,
    badge: payload.badge ?? NOTIFICATION_BADGE,
    tag: payload.tag ?? 'aksurim-payment-reminder',
    data: {
      url: payload.data?.url ?? '/',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ═══════════════════════════════════════════
// NOTIFICATION CLICK — FOCO / ABERTURA DA APP
// ═══════════════════════════════════════════

self.addEventListener(
  'notificationclick',
  (event: NotificationEvent): void => {
    event.notification.close();

    const targetUrl =
      typeof event.notification.data?.url === 'string'
        ? event.notification.data.url
        : '/';

    event.waitUntil(
      (async (): Promise<void> => {
        const clientList = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        });

        // Reutiliza uma janela já aberta da aplicação, se existir.
        for (const client of clientList) {
          const windowClient = client as WindowClient;

          if (windowClient.url.includes(self.location.origin)) {
            await windowClient.focus();

            if ('navigate' in windowClient) {
              await windowClient.navigate(targetUrl);
            }

            return;
          }
        }

        // Nenhuma janela aberta: abre uma nova.
        await self.clients.openWindow(targetUrl);
      })(),
    );
  },
);
