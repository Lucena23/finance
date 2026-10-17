import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
export interface JwtPayload {
    userId: string;
    email: string;
    role: Role;
    familyAccountId: string;
}
export interface AuthenticatedUser {
    userId: string;
    email: string;
    role: Role;
    familyAccountId: string;
    isGlobalAdmin: boolean;
}
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly prisma;
    constructor(config: ConfigService, prisma: PrismaService);
    validate(payload: JwtPayload): Promise<AuthenticatedUser>;
}
export {};
