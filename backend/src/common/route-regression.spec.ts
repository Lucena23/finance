import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';

import { AdminController } from '../admin/admin.controller';
import { AuthController } from '../auth/auth.controller';
import { CategoryController } from '../category/category.controller';
import { DashboardController } from '../dashboard/dashboard.controller';
import { ExpenseController } from '../expense/expense.controller';
import { FamilyAccountController } from '../family-account/family-account.controller';
import { NotificationController } from '../notification/notification.controller';
import { PaymentItemController } from '../payment-item/payment-item.controller';
import { PlanController } from '../plan/plan.controller';
import { ReportsController } from '../reports/reports.controller';
import { SupportController } from '../support/support.controller';
import { UserController } from '../user/user.controller';

/**
 * Testes de Regressão de Rotas (TAREFA 29).
 *
 * Objetivo: garantir que NENHUMA rota anterior foi quebrada/removida durante a
 * evolução v1.1 / v1.2. Este teste introspecciona os metadados dos controllers do
 * NestJS (via Reflect) e valida que o inventário COMPLETO de rotas — conforme
 * o contrato REST do ARCHITECTURE §3.2 — permanece registrado e estável.
 *
 * Estratégia:
 *  1. Extrai o prefixo do controller (@Controller('...')).
 *  2. Extrai cada handler e seu método HTTP (@Get/@Post/@Patch/@Delete).
 *  3. Monta o caminho relativo final (ex: "payment-items/queue").
 *  4. Compara com o inventário esperado (contrato congelado).
 *
 * Qualquer rota removida, renomeada ou com método HTTP alterado faz o teste
 * FALHAR — sinalizando regressão de contrato antes do deploy.
 *
 * O prefixo global da API (`api/v1`, definido em main.ts) é aplicado em
 * runtime pelo NestFactory; aqui validamos os caminhos relativos ao prefixo.
 */

/** Método HTTP legível a partir do enum RequestMethod do NestJS. */
function methodName(method: RequestMethod): string {
  switch (method) {
    case RequestMethod.GET:
      return 'GET';
    case RequestMethod.POST:
      return 'POST';
    case RequestMethod.PATCH:
      return 'PATCH';
    case RequestMethod.DELETE:
      return 'DELETE';
    case RequestMethod.PUT:
      return 'PUT';
    default:
      return 'UNKNOWN';
  }
}

/**
 * Normaliza um segmento de caminho do NestJS.
 *
 * O NestJS usa `'/'` como PATH_METADATA padrão quando o handler não declara
 * caminho explícito (ex: `@Post()`). Esse `'/'` deve ser tratado como vazio
 * para não gerar caminhos duplicados como `users//`.
 */
function normalizeSegment(segment: string | undefined): string {
  if (!segment || segment === '/') {
    return '';
  }
  return segment.replace(/^\/+|\/+$/g, '');
}

/**
 * Extrai o inventário de rotas de um controller NestJS.
 * Retorna strings no formato "METHOD /controller-path/handler-path".
 */
function extractRoutes(
  controller: new (...args: never[]) => unknown,
): string[] {
  const controllerPath = normalizeSegment(
    Reflect.getMetadata(PATH_METADATA, controller) as string | undefined,
  );

  const prototype = controller.prototype as Record<string, unknown>;
  const routes: string[] = [];

  for (const propertyName of Object.getOwnPropertyNames(prototype)) {
    if (propertyName === 'constructor') {
      continue;
    }

    const handler = prototype[propertyName];
    if (typeof handler !== 'function') {
      continue;
    }

    const method = Reflect.getMetadata(
      METHOD_METADATA,
      handler,
    ) as RequestMethod | undefined;

    if (method === undefined) {
      continue;
    }

    const handlerPath = normalizeSegment(
      Reflect.getMetadata(PATH_METADATA, handler) as string | undefined,
    );

    const fullPath = [controllerPath, handlerPath]
      .filter((segment) => segment.length > 0)
      .join('/');

    routes.push(`${methodName(method)} /${fullPath}`);
  }

  return routes.sort();
}

/**
 * Inventário CONGELADO de rotas — contrato REST do ARCHITECTURE §3.2 + Freemium v1.2.
 * Este é o "golden master": qualquer divergência indica regressão.
 */
const EXPECTED_ROUTES: Record<string, string[]> = {
  AuthController: [
    'GET /auth/verify',
    'POST /auth/forgot-password',
    'POST /auth/login',
    'POST /auth/register',
    'POST /auth/reset-password',
  ],
  UserController: [
    'DELETE /users/:id',
    'GET /users',
    'PATCH /users/:id',
    'POST /users',
  ],
  FamilyAccountController: [
    'GET /family-account/current',
    'PATCH /family-account/current',
    'POST /family-account',
  ],
  CategoryController: [
    'DELETE /categories/:id',
    'GET /categories',
    'PATCH /categories/:id',
    'POST /categories',
  ],
  ExpenseController: [
    'DELETE /expenses/:id',
    'GET /expenses',
    'GET /expenses/:id',
    'PATCH /expenses/:id',
    'POST /expenses',
    'POST /expenses/:id/cancel-recurrence',
    'POST /expenses/:id/restore',
  ],
  PaymentItemController: [
    'GET /payment-items/history',
    'GET /payment-items/queue',
    'PATCH /payment-items/:id',
    'PATCH /payment-items/:id/pay',
    'PATCH /payment-items/:id/undo-pay',
  ],
  DashboardController: [
    'GET /dashboard/category-distribution',
    'GET /dashboard/monthly-evolution',
    'GET /dashboard/summary',
  ],
  NotificationController: [
    'DELETE /notifications/subscribe',
    'POST /notifications/subscribe',
  ],
  SupportController: ['POST /support'],
  AdminController: [
    'GET /admin/leads',
    'GET /admin/leads/export',
    'GET /admin/metrics',
    'PATCH /admin/families/:id/plan',
  ],
  PlanController: [
    'GET /plan',
    'GET /plan/locked-summary',
  ],
  ReportsController: [
    'GET /reports/csv',
    'GET /reports/pdf',
  ],
};

describe('Regressão de Rotas (TAREFA 29) — contrato REST §3.2', () => {
  const controllers: Array<{
    name: string;
    controller: new (...args: never[]) => unknown;
  }> = [
    { name: 'AuthController', controller: AuthController },
    { name: 'UserController', controller: UserController },
    { name: 'FamilyAccountController', controller: FamilyAccountController },
    { name: 'CategoryController', controller: CategoryController },
    { name: 'ExpenseController', controller: ExpenseController },
    { name: 'PaymentItemController', controller: PaymentItemController },
    { name: 'DashboardController', controller: DashboardController },
    { name: 'NotificationController', controller: NotificationController },
    { name: 'SupportController', controller: SupportController },
    { name: 'AdminController', controller: AdminController },
    { name: 'PlanController', controller: PlanController },
    { name: 'ReportsController', controller: ReportsController },
  ];

  it.each(controllers)(
    '$name mantém EXATAMENTE o inventário de rotas esperado (sem regressão)',
    ({ name, controller }) => {
      const actual = extractRoutes(controller);
      const expected = [...EXPECTED_ROUTES[name]].sort();

      expect(actual).toEqual(expected);
    },
  );

  it('nenhuma rota anterior foi removida do inventário global', () => {
    const allActual = controllers.flatMap(({ controller }) =>
      extractRoutes(controller),
    );

    const allExpected = Object.values(EXPECTED_ROUTES).flat();

    // Toda rota esperada DEVE existir no código atual.
    for (const route of allExpected) {
      expect(allActual).toContain(route);
    }

    // E o total de rotas deve bater (nenhuma rota nova inesperada).
    expect(allActual.length).toBe(allExpected.length);
  });

  it('rotas críticas do MVP permanecem intactas', () => {
    const criticalRoutes = [
      'POST /auth/login',
      'POST /auth/register',
      'GET /payment-items/queue',
      'GET /payment-items/history',
      'PATCH /payment-items/:id/pay',
      'POST /expenses',
      'PATCH /expenses/:id',
      'GET /dashboard/summary',
    ];

    const allActual = controllers.flatMap(({ controller }) =>
      extractRoutes(controller),
    );

    for (const route of criticalRoutes) {
      expect(allActual).toContain(route);
    }
  });

  it('as novas rotas da v1.1 e v1.2 estão registradas (Support + Admin + Plan + Reports)', () => {
    const allActual = controllers.flatMap(({ controller }) =>
      extractRoutes(controller),
    );

    expect(allActual).toContain('POST /support');
    expect(allActual).toContain('GET /admin/metrics');
    expect(allActual).toContain('GET /admin/leads');
    expect(allActual).toContain('GET /admin/leads/export');
    expect(allActual).toContain('PATCH /admin/families/:id/plan');
    expect(allActual).toContain('GET /plan');
    expect(allActual).toContain('GET /plan/locked-summary');
    expect(allActual).toContain('GET /reports/pdf');
    expect(allActual).toContain('GET /reports/csv');
  });
});
