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
exports.UpdateFamilyPlanDto = exports.AdminPlanAction = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const client_1 = require("@prisma/client");
var AdminPlanAction;
(function (AdminPlanAction) {
    AdminPlanAction["GRANT_PREMIUM"] = "GRANT_PREMIUM";
    AdminPlanAction["EXTEND_TRIAL"] = "EXTEND_TRIAL";
    AdminPlanAction["REVOKE"] = "REVOKE";
})(AdminPlanAction || (exports.AdminPlanAction = AdminPlanAction = {}));
class UpdateFamilyPlanDto {
}
exports.UpdateFamilyPlanDto = UpdateFamilyPlanDto;
__decorate([
    (0, class_validator_1.IsEnum)(AdminPlanAction),
    __metadata("design:type", String)
], UpdateFamilyPlanDto.prototype, "action", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.BillingCycle),
    __metadata("design:type", String)
], UpdateFamilyPlanDto.prototype, "billingCycle", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(365),
    __metadata("design:type", Number)
], UpdateFamilyPlanDto.prototype, "trialDays", void 0);
//# sourceMappingURL=update-family-plan.dto.js.map