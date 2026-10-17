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
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const family_scope_decorator_1 = require("../common/decorators/family-scope.decorator");
const plan_decorators_1 = require("../plan/plan.decorators");
const plan_constants_1 = require("../plan/plan.constants");
const plan_service_1 = require("../plan/plan.service");
const reports_service_1 = require("./reports.service");
let ReportsController = class ReportsController {
    constructor(reportsService, planService) {
        this.reportsService = reportsService;
        this.planService = planService;
    }
    async generatePdfReport(user, startDate, endDate, type, res) {
        const pdfDoc = await this.reportsService.generateFinancialReport(user, startDate, endDate, type);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=Relatorio_Aksurim_${type}.pdf`,
        });
        pdfDoc.pipe(res);
        pdfDoc.end();
    }
    async exportCsv(scope, user, res) {
        if (this.planService && user?.role) {
            await this.planService.assertMemberCanWrite(scope.familyAccountId, user.role);
        }
        const csvContent = await this.reportsService.generateCsvExport(scope.familyAccountId);
        res.set({
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="Dados_Aksurim_Controle.csv"',
        });
        res.send(csvContent);
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, plan_decorators_1.RequiresPremium)(plan_constants_1.PremiumFeature.REPORTS),
    (0, common_1.Get)('pdf'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __param(3, (0, common_1.Query)('type')),
    __param(4, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "generatePdfReport", null);
__decorate([
    (0, common_1.Get)('csv'),
    __param(0, (0, family_scope_decorator_1.FamilyScopeParam)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "exportCsv", null);
exports.ReportsController = ReportsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('reports'),
    __param(1, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [reports_service_1.ReportsService,
        plan_service_1.PlanService])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map