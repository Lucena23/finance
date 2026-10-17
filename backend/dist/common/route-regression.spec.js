"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("@nestjs/common/constants");
const common_1 = require("@nestjs/common");
const admin_controller_1 = require("../admin/admin.controller");
const auth_controller_1 = require("../auth/auth.controller");
const category_controller_1 = require("../category/category.controller");
const dashboard_controller_1 = require("../dashboard/dashboard.controller");
const expense_controller_1 = require("../expense/expense.controller");
const family_account_controller_1 = require("../family-account/family-account.controller");
const notification_controller_1 = require("../notification/notification.controller");
const payment_item_controller_1 = require("../payment-item/payment-item.controller");
const plan_controller_1 = require("../plan/plan.controller");
const reports_controller_1 = require("../reports/reports.controller");
const support_controller_1 = require("../support/support.controller");
const user_controller_1 = require("../user/user.controller");
function methodName(method) {
    switch (method) {
        case common_1.RequestMethod.GET:
            return 'GET';
        case common_1.RequestMethod.POST:
            return 'POST';
        case common_1.RequestMethod.PATCH:
            return 'PATCH';
        case common_1.RequestMethod.DELETE:
            return 'DELETE';
        case common_1.RequestMethod.PUT:
            return 'PUT';
        default:
            return 'UNKNOWN';
    }
}
function normalizeSegment(segment) {
    if (!segment || segment === '/') {
        return '';
    }
    return segment.replace(/^\/+|\/+$/g, '');
}
function extractRoutes(controller) {
    const controllerPath = normalizeSegment(Reflect.getMetadata(constants_1.PATH_METADATA, controller));
    const prototype = controller.prototype;
    const routes = [];
    for (const propertyName of Object.getOwnPropertyNames(prototype)) {
        if (propertyName === 'constructor') {
            continue;
        }
        const handler = prototype[propertyName];
        if (typeof handler !== 'function') {
            continue;
        }
        const method = Reflect.getMetadata(constants_1.METHOD_METADATA, handler);
        if (method === undefined) {
            continue;
        }
        const handlerPath = normalizeSegment(Reflect.getMetadata(constants_1.PATH_METADATA, handler));
        const fullPath = [controllerPath, handlerPath]
            .filter((segment) => segment.length > 0)
            .join('/');
        routes.push(`${methodName(method)} /${fullPath}`);
    }
    return routes.sort();
}
const EXPECTED_ROUTES = {
    AuthController: [
        'GET /auth/verify',
        'POST /auth/forgot-password',
        'POST /auth/login',
        'POST /auth/register',
        'POST /auth/resend-verification',
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
    const controllers = [
        { name: 'AuthController', controller: auth_controller_1.AuthController },
        { name: 'UserController', controller: user_controller_1.UserController },
        { name: 'FamilyAccountController', controller: family_account_controller_1.FamilyAccountController },
        { name: 'CategoryController', controller: category_controller_1.CategoryController },
        { name: 'ExpenseController', controller: expense_controller_1.ExpenseController },
        { name: 'PaymentItemController', controller: payment_item_controller_1.PaymentItemController },
        { name: 'DashboardController', controller: dashboard_controller_1.DashboardController },
        { name: 'NotificationController', controller: notification_controller_1.NotificationController },
        { name: 'SupportController', controller: support_controller_1.SupportController },
        { name: 'AdminController', controller: admin_controller_1.AdminController },
        { name: 'PlanController', controller: plan_controller_1.PlanController },
        { name: 'ReportsController', controller: reports_controller_1.ReportsController },
    ];
    it.each(controllers)('$name mantém EXATAMENTE o inventário de rotas esperado (sem regressão)', ({ name, controller }) => {
        const actual = extractRoutes(controller);
        const expected = [...EXPECTED_ROUTES[name]].sort();
        expect(actual).toEqual(expected);
    });
    it('nenhuma rota anterior foi removida do inventário global', () => {
        const allActual = controllers.flatMap(({ controller }) => extractRoutes(controller));
        const allExpected = Object.values(EXPECTED_ROUTES).flat();
        for (const route of allExpected) {
            expect(allActual).toContain(route);
        }
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
        const allActual = controllers.flatMap(({ controller }) => extractRoutes(controller));
        for (const route of criticalRoutes) {
            expect(allActual).toContain(route);
        }
    });
    it('as novas rotas da v1.1 e v1.2 estão registradas (Support + Admin + Plan + Reports)', () => {
        const allActual = controllers.flatMap(({ controller }) => extractRoutes(controller));
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
//# sourceMappingURL=route-regression.spec.js.map