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
exports.CreateCheckoutDto = void 0;
const client_1 = require("@prisma/client");
const class_validator_1 = require("class-validator");
class CreateCheckoutDto {
}
exports.CreateCheckoutDto = CreateCheckoutDto;
__decorate([
    (0, class_validator_1.IsEnum)(client_1.BillingCycle, { message: 'Ciclo de cobrança inválido.' }),
    __metadata("design:type", String)
], CreateCheckoutDto.prototype, "billingCycle", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['CARD_RECURRING', 'PIX_ONCE', 'CHECKOUT_PRO'], {
        message: 'Modalidade de pagamento inválida.',
    }),
    __metadata("design:type", String)
], CreateCheckoutDto.prototype, "paymentMode", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)({ message: 'É obrigatório aceitar os Termos de Uso e a Política de Reembolso.' }),
    __metadata("design:type", Boolean)
], CreateCheckoutDto.prototype, "acceptedTerms", void 0);
//# sourceMappingURL=create-checkout.dto.js.map