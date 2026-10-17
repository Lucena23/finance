"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const mailer_1 = require("@nestjs-modules/mailer");
const bcrypt = __importStar(require("bcryptjs"));
const crypto = __importStar(require("crypto"));
const prisma_service_1 = require("../prisma/prisma.service");
const email_templates_1 = require("../auth/email-templates");
const client_1 = require("@prisma/client");
let UserService = class UserService {
    constructor(prisma, mailerService) {
        this.prisma = prisma;
        this.mailerService = mailerService;
    }
    getInitials(name) {
        const parts = name.trim().split(/\s+/);
        if (parts.length === 0)
            return 'US';
        if (parts.length === 1)
            return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    async create(familyAccountId, dto) {
        const email = dto.email.toLowerCase().trim();
        const existing = await this.prisma.user.findUnique({ where: { email } });
        if (existing)
            throw new common_1.ConflictException('Email já em uso.');
        const passwordHash = await bcrypt.hash(dto.password, 12);
        const initials = this.getInitials(dto.name);
        const verifyToken = crypto.randomBytes(32).toString('hex');
        const user = await this.prisma.user.create({
            data: {
                name: dto.name.trim(),
                email,
                passwordHash,
                role: dto.role,
                avatarColor: dto.avatarColor,
                initials,
                familyAccountId,
                verifyToken,
            },
        });
        if (this.mailerService) {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
            const verifyLink = `${backendUrl}/api/v1/auth/verify?token=${verifyToken}`;
            const emailHtml = (0, email_templates_1.getWelcomeEmailHtml)(dto.name.trim(), verifyLink, frontendUrl);
            await this.mailerService
                .sendMail({
                to: email,
                subject: 'Bem-vindo ao Aksurim Controle! Confirme seu e-mail.',
                html: emailHtml,
                attachments: [(0, email_templates_1.getLogoCidAttachment)()],
            })
                .catch((err) => console.error('Erro ao enviar e-mail de convite de membro:', err));
        }
        const { passwordHash: _, verifyToken: __, ...safeUser } = user;
        return safeUser;
    }
    async findAll(familyAccountId) {
        return this.prisma.user.findMany({
            where: { familyAccountId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatarColor: true,
                initials: true,
                createdAt: true,
            },
            orderBy: { name: 'asc' },
        });
    }
    async update(familyAccountId, id, dto) {
        const user = await this.prisma.user.findFirst({ where: { id, familyAccountId } });
        if (!user)
            throw new common_1.NotFoundException('Usuário não encontrado.');
        const data = { ...dto };
        if (dto.name)
            data.initials = this.getInitials(dto.name);
        const updated = await this.prisma.user.update({
            where: { id },
            data,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatarColor: true,
                initials: true,
            },
        });
        return updated;
    }
    async remove(familyAccountId, id) {
        const user = await this.prisma.user.findFirst({ where: { id, familyAccountId } });
        if (!user)
            throw new common_1.NotFoundException('Usuário não encontrado.');
        if (user.role === client_1.Role.ADMIN) {
            const admins = await this.prisma.user.count({ where: { familyAccountId, role: client_1.Role.ADMIN } });
            if (admins <= 1)
                throw new common_1.BadRequestException('Não é possível remover o único ADMIN.');
        }
        const fallbackAdmin = await this.prisma.user.findFirst({
            where: {
                familyAccountId,
                role: client_1.Role.ADMIN,
                id: { not: id },
            },
            select: { id: true },
        });
        await this.prisma.$transaction(async (tx) => {
            await tx.pushSubscription.deleteMany({ where: { userId: id } });
            await tx.paymentItem.updateMany({
                where: { paidById: id },
                data: { paidById: null },
            });
            if (fallbackAdmin) {
                await tx.expense.updateMany({
                    where: { familyAccountId, createdById: id },
                    data: { createdById: fallbackAdmin.id },
                });
            }
            await tx.user.delete({ where: { id } });
        });
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mailer_1.MailerService])
], UserService);
//# sourceMappingURL=user.service.js.map