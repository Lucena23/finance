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
exports.FamilyAccountService = void 0;
const common_1 = require("@nestjs/common");
const cpf_util_1 = require("../common/utils/cpf.util");
const prisma_service_1 = require("../prisma/prisma.service");
let FamilyAccountService = class FamilyAccountService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        const ownerCpf = (0, cpf_util_1.formatCpf)(dto.ownerCpf);
        const existing = await this.prisma.familyAccount.findUnique({
            where: { ownerCpf },
            select: { id: true },
        });
        if (existing) {
            throw new common_1.ConflictException('CPF já cadastrado.');
        }
        const trialDaysRaw = Number(process.env.TRIAL_DAYS);
        const trialDays = Number.isFinite(trialDaysRaw) && trialDaysRaw > 0
            ? Math.floor(trialDaysRaw)
            : 15;
        const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
        const family = await this.prisma.familyAccount.create({
            data: {
                name: dto.name.trim(),
                ownerCpf,
                trialEndsAt,
            },
        });
        return this.toView(family);
    }
    async findCurrent(familyAccountId) {
        const family = await this.prisma.familyAccount.findUnique({
            where: { id: familyAccountId },
        });
        if (!family) {
            throw new common_1.NotFoundException('Workspace familiar não encontrado.');
        }
        return this.toView(family);
    }
    async update(familyAccountId, dto) {
        await this.findCurrent(familyAccountId);
        const family = await this.prisma.familyAccount.update({
            where: { id: familyAccountId },
            data: {
                ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
            },
        });
        return this.toView(family);
    }
    toView(family) {
        return {
            id: family.id,
            name: family.name,
            ownerCpfMasked: (0, cpf_util_1.maskCpfForDisplay)(family.ownerCpf),
            createdAt: family.createdAt,
            updatedAt: family.updatedAt,
        };
    }
};
exports.FamilyAccountService = FamilyAccountService;
exports.FamilyAccountService = FamilyAccountService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FamilyAccountService);
//# sourceMappingURL=family-account.service.js.map