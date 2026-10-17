"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FamilyScopeParam = void 0;
const common_1 = require("@nestjs/common");
const family_scope_interceptor_1 = require("../interceptors/family-scope.interceptor");
exports.FamilyScopeParam = (0, common_1.createParamDecorator)((_data, ctx) => {
    const request = ctx
        .switchToHttp()
        .getRequest();
    const scope = request[family_scope_interceptor_1.FAMILY_SCOPE_KEY];
    if (!scope) {
        throw new Error('FamilyScope indisponível: o FamilyScopeInterceptor não foi aplicado a esta rota.');
    }
    return scope;
});
//# sourceMappingURL=family-scope.decorator.js.map