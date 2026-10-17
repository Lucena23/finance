"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FamilyScopeInterceptor = exports.FAMILY_SCOPE_KEY = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const global_admin_decorator_1 = require("../decorators/global-admin.decorator");
const public_decorator_1 = require("../decorators/public.decorator");
exports.FAMILY_SCOPE_KEY = 'familyScope';
const FORBIDDEN_SCOPE_FIELDS = [
    'familyAccountId',
    'familyAccountID',
    'family_account_id',
];
let FamilyScopeInterceptor = class FamilyScopeInterceptor {
    constructor(reflector) {
        this.reflector = reflector;
    }
    intercept(context, next) {
        const isPublic = this.reflector.getAllAndOverride(public_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return next.handle();
        }
        const request = context.switchToHttp().getRequest();
        this.assertNoClientSuppliedScope(request);
        const user = request.user;
        if (!user) {
            throw new common_1.BadRequestException('Escopo familiar indisponível: usuário não autenticado.');
        }
        if (this.shouldBypassFamilyScope(context, user)) {
            request[exports.FAMILY_SCOPE_KEY] = { familyAccountId: '', bypass: true };
            return next.handle();
        }
        request[exports.FAMILY_SCOPE_KEY] = {
            familyAccountId: user.familyAccountId,
            bypass: false,
        };
        return next.handle();
    }
    shouldBypassFamilyScope(context, user) {
        const isGlobalAdminRoute = this.reflector.getAllAndOverride(global_admin_decorator_1.GLOBAL_ADMIN_KEY, [context.getHandler(), context.getClass()]);
        return isGlobalAdminRoute === true && user.isGlobalAdmin === true;
    }
    assertNoClientSuppliedScope(request) {
        const sources = [
            request.query,
            request.body,
            request.params,
        ];
        for (const source of sources) {
            if (!source) {
                continue;
            }
            for (const field of FORBIDDEN_SCOPE_FIELDS) {
                if (Object.prototype.hasOwnProperty.call(source, field)) {
                    throw new common_1.BadRequestException(`O campo "${field}" não pode ser informado pelo cliente. ` +
                        'O escopo familiar é derivado exclusivamente do token de autenticação.');
                }
            }
        }
    }
};
exports.FamilyScopeInterceptor = FamilyScopeInterceptor;
exports.FamilyScopeInterceptor = FamilyScopeInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], FamilyScopeInterceptor);
//# sourceMappingURL=family-scope.interceptor.js.map