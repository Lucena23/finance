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
exports.PaymentItemController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const family_scope_decorator_1 = require("../common/decorators/family-scope.decorator");
const pay_item_dto_1 = require("./dto/pay-item.dto");
const query_history_dto_1 = require("./dto/query-history.dto");
const query_payment_items_dto_1 = require("./dto/query-payment-items.dto");
const update_payment_item_dto_1 = require("./dto/update-payment-item.dto");
const payment_item_service_1 = require("./payment-item.service");
const plan_decorators_1 = require("../plan/plan.decorators");
let PaymentItemController = class PaymentItemController {
    constructor(paymentItemService) {
        this.paymentItemService = paymentItemService;
    }
    getQueue(scope, query) {
        return this.paymentItemService.getQueue(scope.familyAccountId, query);
    }
    getHistory(scope, query) {
        return this.paymentItemService.getHistory(scope.familyAccountId, query);
    }
    pay(scope, user, id, dto) {
        return this.paymentItemService.pay(scope.familyAccountId, id, user.userId, dto);
    }
    undoPay(scope, id) {
        return this.paymentItemService.undoPay(scope.familyAccountId, id);
    }
    updateExpectedAmount(scope, id, dto) {
        return this.paymentItemService.updateExpectedAmount(scope.familyAccountId, id, dto);
    }
};
exports.PaymentItemController = PaymentItemController;
__decorate([
    (0, common_1.Get)('queue'),
    __param(0, (0, family_scope_decorator_1.FamilyScopeParam)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, query_payment_items_dto_1.QueryPaymentItemsDto]),
    __metadata("design:returntype", Promise)
], PaymentItemController.prototype, "getQueue", null);
__decorate([
    (0, common_1.Get)('history'),
    __param(0, (0, family_scope_decorator_1.FamilyScopeParam)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, query_history_dto_1.QueryHistoryDto]),
    __metadata("design:returntype", Promise)
], PaymentItemController.prototype, "getHistory", null);
__decorate([
    (0, plan_decorators_1.MemberWriteRequiresPlan)(),
    (0, common_1.Patch)(':id/pay'),
    __param(0, (0, family_scope_decorator_1.FamilyScopeParam)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, pay_item_dto_1.PayItemDto]),
    __metadata("design:returntype", Promise)
], PaymentItemController.prototype, "pay", null);
__decorate([
    (0, plan_decorators_1.MemberWriteRequiresPlan)(),
    (0, common_1.Patch)(':id/undo-pay'),
    __param(0, (0, family_scope_decorator_1.FamilyScopeParam)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PaymentItemController.prototype, "undoPay", null);
__decorate([
    (0, plan_decorators_1.MemberWriteRequiresPlan)(),
    (0, common_1.Patch)(':id'),
    __param(0, (0, family_scope_decorator_1.FamilyScopeParam)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_payment_item_dto_1.UpdatePaymentItemDto]),
    __metadata("design:returntype", Promise)
], PaymentItemController.prototype, "updateExpectedAmount", null);
exports.PaymentItemController = PaymentItemController = __decorate([
    (0, common_1.Controller)('payment-items'),
    __metadata("design:paramtypes", [payment_item_service_1.PaymentItemService])
], PaymentItemController);
//# sourceMappingURL=payment-item.controller.js.map