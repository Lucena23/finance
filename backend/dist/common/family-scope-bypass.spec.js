"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const rxjs_1 = require("rxjs");
const global_admin_decorator_1 = require("./decorators/global-admin.decorator");
const public_decorator_1 = require("./decorators/public.decorator");
const family_scope_interceptor_1 = require("./interceptors/family-scope.interceptor");
const FAM_A = 'fam-A';
function createContext(request) {
    return {
        switchToHttp: () => ({
            getRequest: () => request,
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
    };
}
function createReflector(metadata) {
    return {
        getAllAndOverride: (key) => {
            if (key === public_decorator_1.IS_PUBLIC_KEY) {
                return metadata.isPublic ?? false;
            }
            if (key === global_admin_decorator_1.GLOBAL_ADMIN_KEY) {
                return metadata.isGlobalAdminRoute ?? false;
            }
            return undefined;
        },
    };
}
const next = { handle: () => (0, rxjs_1.of)('ok') };
function makeUser(overrides = {}) {
    return {
        userId: 'user-1',
        email: 'user@aksurim.com',
        role: client_1.Role.MEMBER,
        familyAccountId: FAM_A,
        isGlobalAdmin: false,
        ...overrides,
    };
}
describe('FamilyScopeInterceptor — Bypass Condicional (TAREFA 24 / RN-15)', () => {
    it('aplica o escopo familiar em rota comum (sem @GlobalAdminOnly)', () => {
        const request = { user: makeUser() };
        const interceptor = new family_scope_interceptor_1.FamilyScopeInterceptor(createReflector({ isGlobalAdminRoute: false }));
        interceptor.intercept(createContext(request), next);
        expect(request[family_scope_interceptor_1.FAMILY_SCOPE_KEY]).toEqual({
            familyAccountId: FAM_A,
            bypass: false,
        });
    });
    it('NÃO faz bypass quando a rota é @GlobalAdminOnly mas o usuário NÃO é Admin Global', () => {
        const request = {
            user: makeUser({ isGlobalAdmin: false, role: client_1.Role.ADMIN }),
        };
        const interceptor = new family_scope_interceptor_1.FamilyScopeInterceptor(createReflector({ isGlobalAdminRoute: true }));
        interceptor.intercept(createContext(request), next);
        expect(request[family_scope_interceptor_1.FAMILY_SCOPE_KEY]).toEqual({
            familyAccountId: FAM_A,
            bypass: false,
        });
    });
    it('NÃO faz bypass quando o usuário é Admin Global mas a rota NÃO é @GlobalAdminOnly', () => {
        const request = {
            user: makeUser({ isGlobalAdmin: true }),
        };
        const interceptor = new family_scope_interceptor_1.FamilyScopeInterceptor(createReflector({ isGlobalAdminRoute: false }));
        interceptor.intercept(createContext(request), next);
        expect(request[family_scope_interceptor_1.FAMILY_SCOPE_KEY]).toEqual({
            familyAccountId: FAM_A,
            bypass: false,
        });
    });
    it('FAZ bypass quando a rota é @GlobalAdminOnly E o usuário é Admin Global', () => {
        const request = {
            user: makeUser({ isGlobalAdmin: true }),
        };
        const interceptor = new family_scope_interceptor_1.FamilyScopeInterceptor(createReflector({ isGlobalAdminRoute: true }));
        interceptor.intercept(createContext(request), next);
        expect(request[family_scope_interceptor_1.FAMILY_SCOPE_KEY]).toEqual({
            familyAccountId: '',
            bypass: true,
        });
    });
    it('ignora rotas @Public() (sem escopo familiar)', () => {
        const request = { user: makeUser() };
        const interceptor = new family_scope_interceptor_1.FamilyScopeInterceptor(createReflector({ isPublic: true }));
        interceptor.intercept(createContext(request), next);
        expect(request[family_scope_interceptor_1.FAMILY_SCOPE_KEY]).toBeUndefined();
    });
    it('bloqueia (400) familyAccountId fornecido pelo cliente mesmo em rota Admin Global', () => {
        const request = {
            user: makeUser({ isGlobalAdmin: true }),
            query: { familyAccountId: 'fam-injetado' },
        };
        const interceptor = new family_scope_interceptor_1.FamilyScopeInterceptor(createReflector({ isGlobalAdminRoute: true }));
        expect(() => interceptor.intercept(createContext(request), next)).toThrow();
        expect(request[family_scope_interceptor_1.FAMILY_SCOPE_KEY]).toBeUndefined();
    });
});
//# sourceMappingURL=family-scope-bypass.spec.js.map