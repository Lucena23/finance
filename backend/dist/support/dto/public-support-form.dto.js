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
exports.PublicSupportFormDto = void 0;
const class_validator_1 = require("class-validator");
class PublicSupportFormDto {
}
exports.PublicSupportFormDto = PublicSupportFormDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Informe seu nome.' }),
    (0, class_validator_1.MinLength)(2, { message: 'O nome deve ter ao menos 2 caracteres.' }),
    (0, class_validator_1.MaxLength)(80, { message: 'O nome deve ter no máximo 80 caracteres.' }),
    __metadata("design:type", String)
], PublicSupportFormDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsEmail)({}, { message: 'Informe um e-mail válido.' }),
    (0, class_validator_1.MaxLength)(120, { message: 'O e-mail deve ter no máximo 120 caracteres.' }),
    __metadata("design:type", String)
], PublicSupportFormDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(60, { message: 'O contato deve ter no máximo 60 caracteres.' }),
    __metadata("design:type", String)
], PublicSupportFormDto.prototype, "contact", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Informe o assunto.' }),
    (0, class_validator_1.MinLength)(3, { message: 'O assunto deve ter ao menos 3 caracteres.' }),
    (0, class_validator_1.MaxLength)(100, { message: 'O assunto deve ter no máximo 100 caracteres.' }),
    __metadata("design:type", String)
], PublicSupportFormDto.prototype, "subject", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Descreva sua dúvida ou solicitação.' }),
    (0, class_validator_1.MinLength)(5, { message: 'A mensagem deve ter ao menos 5 caracteres.' }),
    (0, class_validator_1.MaxLength)(2000, { message: 'A mensagem deve ter no máximo 2000 caracteres.' }),
    __metadata("design:type", String)
], PublicSupportFormDto.prototype, "message", void 0);
//# sourceMappingURL=public-support-form.dto.js.map