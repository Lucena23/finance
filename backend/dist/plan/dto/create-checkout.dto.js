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
    (0, class_validator_1.IsIn)(['PIX_DIRECT', 'CARD_DIRECT', 'CARD_RECURRING', 'PIX_ONCE', 'CHECKOUT_PRO'], {
        message: 'Modalidade de pagamento inválida.',
    }),
    __metadata("design:type", String)
], CreateCheckoutDto.prototype, "paymentMode", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)({
        message: 'É obrigatório aceitar os Termos de Uso e a Política de Reembolso.',
    }),
    __metadata("design:type", Boolean)
], CreateCheckoutDto.prototype, "acceptedTerms", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[a-zA-Z0-9_-]{16,128}$/, {
        message: 'Token criptográfico do cartão inválido.',
    }),
    __metadata("design:type", String)
], CreateCheckoutDto.prototype, "cardToken", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[a-z0-9_]{2,32}$/i, {
        message: 'Bandeira do cartão inválida.',
    }),
    __metadata("design:type", String)
], CreateCheckoutDto.prototype, "paymentMethodId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[0-9]{1,20}$/, {
        message: 'Identificador do emissor inválido.',
    }),
    __metadata("design:type", String)
], CreateCheckoutDto.prototype, "issuerId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(3),
    __metadata("design:type", Number)
], CreateCheckoutDto.prototype, "installments", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[0-9.\-]{11,14}$/, {
        message: 'CPF informado em formato inválido.',
    }),
    __metadata("design:type", String)
], CreateCheckoutDto.prototype, "payerCpf", void 0);
//# sourceMappingURL=create-checkout.dto.js.map