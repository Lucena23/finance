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
const family_scope_decorator_1 = require("../common/decorators/family-scope.decorator");
const locked_summary_query_dto_1 = require("./dto/locked-summary-query.dto");
const plan_service_1 = require("./plan.service");
let PlanController = class PlanController {
    constructor(planService) {
        this.planService = planService;
    }
    getPlan(scope) {
        return this.planService.getPlanInfo(scope.familyAccountId);
    }
    getLockedSummary(scope, query) {
        return this.planService.getLockedMonthSummary(scope.familyAccountId, query.month, query.year);
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
exports.PlanController = PlanController = __decorate([
    (0, common_1.Controller)('plan'),
    __metadata("design:paramtypes", [plan_service_1.PlanService])
], PlanController);
//# sourceMappingURL=plan.controller.js.map