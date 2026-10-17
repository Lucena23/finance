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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const global_admin_decorator_1 = require("../common/decorators/global-admin.decorator");
const global_admin_guard_1 = require("../common/guards/global-admin.guard");
const admin_service_1 = require("./admin.service");
const lead_export_service_1 = require("./lead-export.service");
const update_family_plan_dto_1 = require("./dto/update-family-plan.dto");
let AdminController = class AdminController {
    constructor(adminService, leadExportService) {
        this.adminService = adminService;
        this.leadExportService = leadExportService;
    }
    getMetrics() {
        return this.adminService.getGlobalMetrics();
    }
    getLeads() {
        return this.adminService.getLeads();
    }
    updateFamilyPlan(id, dto) {
        return this.adminService.updateFamilyPlan(id, dto);
    }
    async exportLeads(format, res) {
        const normalized = format === 'csv' ? 'csv' : 'pdf';
        const leads = await this.adminService.getLeads();
        const result = await this.leadExportService.export(leads, normalized);
        res.setHeader('Content-Type', result.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.setHeader('Content-Length', result.buffer.length.toString());
        res.end(result.buffer);
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('metrics'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getMetrics", null);
__decorate([
    (0, common_1.Get)('leads'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getLeads", null);
__decorate([
    (0, common_1.Patch)('families/:id/plan'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_family_plan_dto_1.UpdateFamilyPlanDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateFamilyPlan", null);
__decorate([
    (0, common_1.Get)('leads/export'),
    __param(0, (0, common_1.Query)('format')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "exportLeads", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)('admin'),
    (0, global_admin_decorator_1.GlobalAdminOnly)(),
    (0, common_1.UseGuards)(global_admin_guard_1.GlobalAdminGuard),
    __metadata("design:paramtypes", [admin_service_1.AdminService,
        lead_export_service_1.LeadExportService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map