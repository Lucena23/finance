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
exports.FamilyAccountController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const family_scope_decorator_1 = require("../common/decorators/family-scope.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const create_family_account_dto_1 = require("./dto/create-family-account.dto");
const update_family_account_dto_1 = require("./dto/update-family-account.dto");
const family_account_service_1 = require("./family-account.service");
let FamilyAccountController = class FamilyAccountController {
    constructor(familyAccountService) {
        this.familyAccountService = familyAccountService;
    }
    create(dto) {
        return this.familyAccountService.create(dto);
    }
    findCurrent(scope) {
        return this.familyAccountService.findCurrent(scope.familyAccountId);
    }
    update(scope, dto) {
        return this.familyAccountService.update(scope.familyAccountId, dto);
    }
};
exports.FamilyAccountController = FamilyAccountController;
__decorate([
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_family_account_dto_1.CreateFamilyAccountDto]),
    __metadata("design:returntype", Promise)
], FamilyAccountController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('current'),
    __param(0, (0, family_scope_decorator_1.FamilyScopeParam)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FamilyAccountController.prototype, "findCurrent", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    (0, common_1.Patch)('current'),
    __param(0, (0, family_scope_decorator_1.FamilyScopeParam)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_family_account_dto_1.UpdateFamilyAccountDto]),
    __metadata("design:returntype", Promise)
], FamilyAccountController.prototype, "update", null);
exports.FamilyAccountController = FamilyAccountController = __decorate([
    (0, common_1.Controller)('family-account'),
    __metadata("design:paramtypes", [family_account_service_1.FamilyAccountService])
], FamilyAccountController);
//# sourceMappingURL=family-account.controller.js.map