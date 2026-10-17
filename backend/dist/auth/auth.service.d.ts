import { JwtService } from '@nestjs/jwt';
import { MailerService } from '@nestjs-modules/mailer';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
export interface JwtPayload {
    userId: string;
    email: string;
    role: Role;
    familyAccountId: string;
    isGlobalAdmin?: boolean;
}
export interface SafeUser {
    id: string;
    name: string;
    email: string;
    role: Role;
    initials: string;
    avatarColor: string;
    familyAccountId: string;
    isEmailVerified: boolean;
    isGlobalAdmin?: boolean;
}
export interface AuthResponse {
    accessToken: string;
    user: SafeUser;
}
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    private readonly mailerService;
    constructor(prisma: PrismaService, jwtService: JwtService, mailerService: MailerService);
    register(dto: RegisterDto): Promise<AuthResponse>;
    private readonly resendCooldowns;
    resendVerificationEmail(userId: string): Promise<{
        message: string;
        cooldownSeconds: number;
    }>;
    verifyEmail(token: string): Promise<string>;
    login(dto: LoginDto): Promise<AuthResponse>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    private buildAuthResponse;
}
