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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcryptjs"));
const crypto = __importStar(require("crypto"));
const mailer_1 = require("@nestjs-modules/mailer");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const email_templates_1 = require("./email-templates");
const BCRYPT_SALT_ROUNDS = 10;
const AVATAR_COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#f43f5e',
];
function getInitials(name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1)
        return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function pickAvatarColor(excludeColors) {
    const available = AVATAR_COLORS.filter((c) => !excludeColors.includes(c));
    const pool = available.length > 0 ? available : AVATAR_COLORS;
    return pool[Math.floor(Math.random() * pool.length)];
}
let AuthService = class AuthService {
    constructor(prisma, jwtService, mailerService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.mailerService = mailerService;
        this.resendCooldowns = new Map();
    }
    async register(dto) {
        const email = dto.email.toLowerCase().trim();
        const existingUser = await this.prisma.user.findUnique({
            where: { email },
            select: { id: true },
        });
        if (existingUser) {
            throw new common_1.ConflictException('E-mail já cadastrado.');
        }
        const existingFamily = await this.prisma.familyAccount.findUnique({
            where: { ownerCpf: dto.ownerCpf },
            select: { id: true },
        });
        if (existingFamily) {
            throw new common_1.ConflictException('CPF já cadastrado.');
        }
        const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
        const initials = getInitials(dto.name);
        const avatarColor = pickAvatarColor([]);
        const verifyToken = crypto.randomBytes(32).toString('hex');
        const trialDaysRaw = Number(process.env.TRIAL_DAYS);
        const trialDays = Number.isFinite(trialDaysRaw) && trialDaysRaw > 0
            ? Math.floor(trialDaysRaw)
            : 15;
        const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
        const result = await this.prisma.$transaction(async (tx) => {
            const family = await tx.familyAccount.create({
                data: {
                    name: dto.familyName.trim(),
                    ownerCpf: dto.ownerCpf,
                    trialEndsAt,
                },
            });
            await tx.category.createMany({
                data: [
                    { name: 'Moradia', color: '#3b82f6', icon: 'Home', familyAccountId: family.id },
                    { name: 'Alimentação', color: '#f59e0b', icon: 'ShoppingCart', familyAccountId: family.id },
                    { name: 'Transporte', color: '#10b981', icon: 'CarFront', familyAccountId: family.id },
                ],
            });
            const user = await tx.user.create({
                data: {
                    name: dto.name.trim(),
                    email,
                    whatsapp: dto.whatsapp,
                    passwordHash,
                    role: client_1.Role.ADMIN,
                    initials,
                    avatarColor,
                    familyAccountId: family.id,
                    verifyToken,
                },
            });
            return user;
        });
        const frontendUrl = this.getFrontendUrl();
        const backendUrl = this.getBackendUrl();
        const verifyLink = `${backendUrl}/api/v1/auth/verify?token=${verifyToken}`;
        const emailHtml = (0, email_templates_1.getWelcomeEmailHtml)(dto.name.trim(), verifyLink, frontendUrl);
        await this.mailerService.sendMail({
            to: email,
            subject: 'Bem-vindo ao Aksurim Controle! Confirme seu e-mail.',
            html: emailHtml,
            attachments: [(0, email_templates_1.getLogoCidAttachment)()],
        }).catch((err) => console.error('Erro ao enviar e-mail de boas vindas:', err));
        return this.buildAuthResponse(result);
    }
    getFrontendUrl() {
        if (process.env.FRONTEND_URL) {
            return process.env.FRONTEND_URL;
        }
        return process.env.NODE_ENV === 'production'
            ? 'https://controle.aksurim.com'
            : 'http://localhost:5173';
    }
    getBackendUrl() {
        if (process.env.BACKEND_URL) {
            return process.env.BACKEND_URL;
        }
        return process.env.NODE_ENV === 'production'
            ? 'https://controle.aksurim.com'
            : 'http://localhost:3000';
    }
    async resendVerificationEmail(userId) {
        const COOLDOWN_MS = 60 * 1000;
        const now = Date.now();
        const lastSentAt = this.resendCooldowns.get(userId) ?? 0;
        const elapsed = now - lastSentAt;
        if (elapsed < COOLDOWN_MS) {
            const remaining = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
            return {
                message: `Aguarde ${remaining}s antes de solicitar um novo reenvio.`,
                cooldownSeconds: remaining,
            };
        }
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Usuário não encontrado.');
        }
        if (user.isEmailVerified) {
            return {
                message: 'Seu e-mail já está confirmado! Faça login novamente para atualizar a sessão.',
                cooldownSeconds: 0,
            };
        }
        const verifyToken = user.verifyToken || crypto.randomBytes(32).toString('hex');
        if (!user.verifyToken) {
            await this.prisma.user.update({
                where: { id: user.id },
                data: { verifyToken },
            });
        }
        const frontendUrl = this.getFrontendUrl();
        const backendUrl = this.getBackendUrl();
        const verifyLink = `${backendUrl}/api/v1/auth/verify?token=${verifyToken}`;
        const emailHtml = (0, email_templates_1.getWelcomeEmailHtml)(user.name, verifyLink, frontendUrl);
        await this.mailerService.sendMail({
            to: user.email,
            subject: 'Confirme seu e-mail — Aksurim Controle',
            html: emailHtml,
            attachments: [(0, email_templates_1.getLogoCidAttachment)()],
        });
        this.resendCooldowns.set(userId, now);
        return {
            message: 'Novo link de ativação enviado com sucesso! Verifique sua caixa de entrada e a pasta de Spam.',
            cooldownSeconds: 60,
        };
    }
    async verifyEmail(token) {
        const user = await this.prisma.user.findFirst({
            where: { verifyToken: token },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Token inválido ou expirado.');
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                isEmailVerified: true,
                verifyToken: null,
            },
        });
        const frontendUrl = this.getFrontendUrl();
        return (0, email_templates_1.getVerificationSuccessHtml)(frontendUrl);
    }
    async login(dto) {
        const email = dto.email.toLowerCase().trim();
        const user = await this.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Credenciais inválidas.');
        }
        const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
        if (!passwordMatches) {
            throw new common_1.UnauthorizedException('Credenciais inválidas.');
        }
        return this.buildAuthResponse(user);
    }
    async forgotPassword(dto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email.toLowerCase().trim() },
        });
        if (!user) {
            return { message: 'Se o e-mail existir, um link de recuperação foi enviado.' };
        }
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpires = new Date(Date.now() + 1000 * 60 * 60);
        await this.prisma.user.update({
            where: { id: user.id },
            data: { resetToken, resetTokenExpires },
        });
        const frontendUrl = process.env.FRONTEND_URL || 'https://controle.aksurim.com';
        const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
        await this.mailerService.sendMail({
            to: user.email,
            subject: 'Recuperação de Senha - Aksurim Controle',
            attachments: [(0, email_templates_1.getLogoCidAttachment)()],
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px; background-color: #1C1F22; color: #FFFFFF;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="cid:aksurim-logo" alt="Aksurim Logo" style="height: 42px; display: inline-block;" />
          </div>
          <h2 style="color: #111827; text-align: center;">Olá, ${user.name}</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.5; text-align: center;">
            Você solicitou a recuperação de senha da sua conta no <strong>Aksurim Controle</strong>.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #D9F924; color: #111827; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">
              Criar Nova Senha
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px; text-align: center;">
            Este link é seguro e válido por 1 hora.<br/>
            Se você não solicitou essa alteração, ignore este e-mail.
          </p>
          <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            Descubra mais soluções inteligentes em <a href="https://aksurim.com" style="color: #111827; font-weight: bold; text-decoration: none;">aksurim.com</a><br/>
            &copy; ${new Date().getFullYear()} Aksurim Software. Marca Registrada.
          </p>
        </div>
      `,
        });
        return { message: 'Se o e-mail existir, um link de recuperação foi enviado.' };
    }
    async resetPassword(dto) {
        const user = await this.prisma.user.findFirst({
            where: {
                resetToken: dto.token,
                resetTokenExpires: { gt: new Date() },
            },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Token inválido ou expirado.');
        }
        const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_SALT_ROUNDS);
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash,
                resetToken: null,
                resetTokenExpires: null,
            },
        });
        return { message: 'Senha atualizada com sucesso.' };
    }
    buildAuthResponse(user) {
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            familyAccountId: user.familyAccountId,
            isGlobalAdmin: user.isGlobalAdmin,
        };
        const accessToken = this.jwtService.sign(payload);
        const safeUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            initials: user.initials,
            avatarColor: user.avatarColor,
            familyAccountId: user.familyAccountId,
            isEmailVerified: user.isEmailVerified,
            isGlobalAdmin: user.isGlobalAdmin,
        };
        return { accessToken, user: safeUser };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        mailer_1.MailerService])
], AuthService);
//# sourceMappingURL=auth.service.js.map