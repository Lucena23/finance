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
exports.PlanGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const client_1 = require("@prisma/client");
const plan_constants_1 = require("./plan.constants");
const plan_decorators_1 = require("./plan.decorators");
const plan_required_exception_1 = require("./plan-required.exception");
const plan_service_1 = require("./plan.service");
let PlanGuard = class PlanGuard {
    constructor(reflector, planService) {
        this.reflector = reflector;
        this.planService = planService;
    }
    async canActivate(context) {
        const targets = [context.getHandler(), context.getClass()];
        const feature = this.reflector.getAllAndOverride(plan_decorators_1.REQUIRES_PREMIUM_KEY, targets);
        const memberWrite = this.reflector.getAllAndOverride(plan_decorators_1.MEMBER_WRITE_KEY, targets);
        if (!feature && !memberWrite) {
            return true;
        }
        const user = context.switchToHttp().getRequest().user;
        if (!user) {
            return true;
        }
        if (feature) {
            await this.planService.assertPremium(user.familyAccountId, feature);
        }
        if (memberWrite && user.role === client_1.Role.MEMBER) {
            const hasAccess = await this.planService.hasPremiumAccess(user.familyAccountId);
            if (!hasAccess) {
                throw new plan_required_exception_1.PlanRequiredException(plan_constants_1.PremiumFeature.FAMILY_PLAN_EXPIRED, 'O plano Premium da sua família expirou. Peça ao titular para assinar e liberar suas ações.');
            }
        }
        return true;
    }
};
exports.PlanGuard = PlanGuard;
exports.PlanGuard = PlanGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        plan_service_1.PlanService])
], PlanGuard);
//# sourceMappingURL=plan.guard.js.map