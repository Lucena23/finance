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
exports.ExpenseController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const family_scope_decorator_1 = require("../common/decorators/family-scope.decorator");
const create_expense_dto_1 = require("./dto/create-expense.dto");
const query_expenses_dto_1 = require("./dto/query-expenses.dto");
const update_expense_dto_1 = require("./dto/update-expense.dto");
const expense_service_1 = require("./expense.service");
let ExpenseController = class ExpenseController {
    constructor(expenseService) {
        this.expenseService = expenseService;
    }
    findAll(scope, query) {
        return this.expenseService.findAll(scope.familyAccountId, query);
    }
    findOne(scope, id) {
        return this.expenseService.findOne(scope.familyAccountId, id);
    }
    create(scope, user, dto) {
        return this.expenseService.create(scope.familyAccountId, user.userId, dto, user.role);
    }
    update(scope, user, id, dto) {
        return this.expenseService.update(scope.familyAccountId, id, dto, user.role);
    }
    remove(scope, user, id) {
        return this.expenseService.softDelete(scope.familyAccountId, id, user.role);
    }
    restore(scope, user, id) {
        return this.expenseService.restore(scope.familyAccountId, id, user.role);
    }
    cancelRecurrence(scope, user, id) {
        return this.expenseService.cancelRecurrence(scope.familyAccountId, id, user.role);
    }
};
exports.ExpenseController = ExpenseController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, family_scope_decorator_1.FamilyScopeParam)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, query_expenses_dto_1.QueryExpensesDto]),
    __metadata("design:returntype", Promise)
], ExpenseController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, family_scope_decorator_1.FamilyScopeParam)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ExpenseController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, family_scope_decorator_1.FamilyScopeParam)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, create_expense_dto_1.CreateExpenseDto]),
    __metadata("design:returntype", Promise)
], ExpenseController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, family_scope_decorator_1.FamilyScopeParam)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, update_expense_dto_1.UpdateExpenseDto]),
    __metadata("design:returntype", Promise)
], ExpenseController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, family_scope_decorator_1.FamilyScopeParam)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], ExpenseController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/restore'),
    __param(0, (0, family_scope_decorator_1.FamilyScopeParam)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], ExpenseController.prototype, "restore", null);
__decorate([
    (0, common_1.Post)(':id/cancel-recurrence'),
    __param(0, (0, family_scope_decorator_1.FamilyScopeParam)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], ExpenseController.prototype, "cancelRecurrence", null);
exports.ExpenseController = ExpenseController = __decorate([
    (0, common_1.Controller)('expenses'),
    __metadata("design:paramtypes", [expense_service_1.ExpenseService])
], ExpenseController);
//# sourceMappingURL=expense.controller.js.map