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
exports.CategoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const plan_service_1 = require("../plan/plan.service");
let CategoryService = class CategoryService {
    constructor(prisma, planService) {
        this.prisma = prisma;
        this.planService = planService;
    }
    async findAll(familyAccountId) {
        return this.prisma.category.findMany({
            where: { familyAccountId },
            orderBy: { name: 'asc' },
        });
    }
    async create(familyAccountId, dto, userRole) {
        if (this.planService) {
            if (userRole) {
                await this.planService.assertMemberCanWrite(familyAccountId, userRole);
            }
            await this.planService.assertCanCreateCategory(familyAccountId);
        }
        return this.prisma.category.create({
            data: {
                name: dto.name.trim(),
                color: dto.color,
                icon: dto.icon.trim(),
                familyAccountId,
            },
        });
    }
    async update(familyAccountId, id, dto, userRole) {
        if (this.planService && userRole) {
            await this.planService.assertMemberCanWrite(familyAccountId, userRole);
        }
        await this.findOneOrFail(familyAccountId, id);
        return this.prisma.category.update({
            where: { id },
            data: {
                ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
                ...(dto.color !== undefined ? { color: dto.color } : {}),
                ...(dto.icon !== undefined ? { icon: dto.icon.trim() } : {}),
            },
        });
    }
    async remove(familyAccountId, id, userRole) {
        if (this.planService && userRole) {
            await this.planService.assertMemberCanWrite(familyAccountId, userRole);
        }
        await this.findOneOrFail(familyAccountId, id);
        const linkedExpenses = await this.prisma.expense.count({
            where: { categoryId: id, familyAccountId },
        });
        if (linkedExpenses > 0) {
            throw new common_1.ConflictException('Não é possível excluir uma categoria com despesas vinculadas.');
        }
        await this.prisma.category.delete({ where: { id } });
    }
    async findOneOrFail(familyAccountId, id) {
        const category = await this.prisma.category.findFirst({
            where: { id, familyAccountId },
        });
        if (!category) {
            throw new common_1.NotFoundException('Categoria não encontrada.');
        }
        return category;
    }
};
exports.CategoryService = CategoryService;
exports.CategoryService = CategoryService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        plan_service_1.PlanService])
], CategoryService);
//# sourceMappingURL=category.service.js.map