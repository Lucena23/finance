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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const family_scope_decorator_1 = require("../common/decorators/family-scope.decorator");
const public_decorator_1 = require("../common/decorators/public.decorator");
const create_checkout_dto_1 = require("./dto/create-checkout.dto");
const locked_summary_query_dto_1 = require("./dto/locked-summary-query.dto");
const plan_payment_service_1 = require("./plan-payment.service");
const plan_service_1 = require("./plan.service");
let PlanController = class PlanController {
    constructor(planService, planPaymentService) {
        this.planService = planService;
        this.planPaymentService = planPaymentService;
    }
    async getPlan(scope) {
        await this.planPaymentService.reconcileFamilyPending(scope.familyAccountId);
        return this.planService.getPlanInfo(scope.familyAccountId);
    }
    getLockedSummary(scope, query) {
        return this.planService.getLockedMonthSummary(scope.familyAccountId, query.month, query.year);
    }
    getSubscriptionSummary(scope, user) {
        return this.planPaymentService.getFamilySubscriptionSummary(scope.familyAccountId, user.email);
    }
    createCheckout(scope, user, dto) {
        return this.planPaymentService.createCheckout(scope.familyAccountId, user, dto);
    }
    syncTransaction(scope, id) {
        return this.planPaymentService.verifyAndSyncTransaction(scope.familyAccountId, id);
    }
    cancelSubscription(scope, user) {
        return this.planPaymentService.cancelRecurringSubscription(scope.familyAccountId, user);
    }
    requestCdcRefund(scope, user) {
        return this.planPaymentService.requestCdcRefund(scope.familyAccountId, user);
    }
    handleWebhook(xSignature, xRequestId, query, body) {
        return this.planPaymentService.handleWebhook({
            xSignature,
            xRequestId,
            query,
            body: body ?? {},
        });
    }
};
exports.PlanController = PlanController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, family_scope_decorator_1.FamilyScopeParam)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PlanController.prototype, "getPlan", null);
__decorate([
    (0, common_1.Get)('locked-summary'),
    __param(0, (0, family_scope_decorator_1.FamilyScopeParam)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, locked_summary_query_dto_1.LockedSummaryQueryDto]),
    __metadata("design:returntype", Promise)
], PlanController.prototype, "getLockedSummary", null);
__decorate([
    (0, common_1.Get)('subscription'),
    __param(0, (0, family_scope_decorator_1.FamilyScopeParam)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PlanController.prototype, "getSubscriptionSummary", null);
__decorate([
    (0, common_1.Post)('checkout'),
    __param(0, (0, family_scope_decorator_1.FamilyScopeParam)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, create_checkout_dto_1.CreateCheckoutDto]),
    __metadata("design:returntype", Promise)
], PlanController.prototype, "createCheckout", null);
__decorate([
    (0, common_1.Get)('transactions/:id/sync'),
    __param(0, (0, family_scope_decorator_1.FamilyScopeParam)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PlanController.prototype, "syncTransaction", null);
__decorate([
    (0, common_1.Post)('subscription/cancel'),
    __param(0, (0, family_scope_decorator_1.FamilyScopeParam)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PlanController.prototype, "cancelSubscription", null);
__decorate([
    (0, common_1.Post)('subscription/refund'),
    __param(0, (0, family_scope_decorator_1.FamilyScopeParam)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PlanController.prototype, "requestCdcRefund", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('webhook'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Headers)('x-signature')),
    __param(1, (0, common_1.Headers)('x-request-id')),
    __param(2, (0, common_1.Query)()),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], PlanController.prototype, "handleWebhook", null);
exports.PlanController = PlanController = __decorate([
    (0, common_1.Controller)('plan'),
    __metadata("design:paramtypes", [plan_service_1.PlanService,
        plan_payment_service_1.PlanPaymentService])
], PlanController);
//# sourceMappingURL=plan.controller.js.map