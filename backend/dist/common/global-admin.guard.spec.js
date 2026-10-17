"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const global_admin_decorator_1 = require("./decorators/global-admin.decorator");
const global_admin_guard_1 = require("./guards/global-admin.guard");
function createContext(user) {
    return {
        switchToHttp: () => ({
            getRequest: () => ({ user }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
    };
}
function createReflector(isGlobalAdminRoute) {
    return {
        getAllAndOverride: (key) => key === global_admin_decorator_1.GLOBAL_ADMIN_KEY ? isGlobalAdminRoute : undefined,
    };
}
function makeUser(overrides = {}) {
    return {
        userId: 'user-1',
        email: 'user@aksurim.com',
        role: client_1.Role.MEMBER,
        familyAccountId: 'fam-A',
        isGlobalAdmin: false,
        ...overrides,
    };
}
describe('GlobalAdminGuard (TAREFA 25 / RN-15)', () => {
    it('libera rotas sem @GlobalAdminOnly()', () => {
        const guard = new global_admin_guard_1.GlobalAdminGuard(createReflector(false));
        expect(guard.canActivate(createContext(makeUser()))).toBe(true);
    });
    it('permite acesso quando o usuário é Admin Global', () => {
        const guard = new global_admin_guard_1.GlobalAdminGuard(createReflector(true));
        expect(guard.canActivate(createContext(makeUser({ isGlobalAdmin: true })))).toBe(true);
    });
    it('bloqueia (403) Role.ADMIN sem isGlobalAdmin', () => {
        const guard = new global_admin_guard_1.GlobalAdminGuard(createReflector(true));
        expect(() => guard.canActivate(createContext(makeUser({ role: client_1.Role.ADMIN })))).toThrow(common_1.ForbiddenException);
    });
    it('bloqueia (403) usuário MEMBER comum', () => {
        const guard = new global_admin_guard_1.GlobalAdminGuard(createReflector(true));
        expect(() => guard.canActivate(createContext(makeUser()))).toThrow(common_1.ForbiddenException);
    });
    it('bloqueia (403) quando não há usuário autenticado', () => {
        const guard = new global_admin_guard_1.GlobalAdminGuard(createReflector(true));
        expect(() => guard.canActivate(createContext(undefined))).toThrow(common_1.ForbiddenException);
    });
});
//# sourceMappingURL=global-admin.guard.spec.js.map