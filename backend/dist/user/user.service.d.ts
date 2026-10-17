import { MailerService } from '@nestjs-modules/mailer';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UserService {
    private readonly prisma;
    private readonly mailerService?;
    constructor(prisma: PrismaService, mailerService?: MailerService | undefined);
    private getInitials;
    create(familyAccountId: string, dto: CreateUserDto): Promise<{
        id: string;
        email: string;
        name: string;
        whatsapp: string | null;
        isEmailVerified: boolean;
        isGlobalAdmin: boolean;
        resetToken: string | null;
        resetTokenExpires: Date | null;
        role: import(".prisma/client").$Enums.Role;
        avatarColor: string;
        initials: string;
        familyAccountId: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findAll(familyAccountId: string): Promise<{
        id: string;
        email: string;
        name: string;
        role: import(".prisma/client").$Enums.Role;
        avatarColor: string;
        initials: string;
        createdAt: Date;
    }[]>;
    update(familyAccountId: string, id: string, dto: UpdateUserDto): Promise<{
        id: string;
        email: string;
        name: string;
        role: import(".prisma/client").$Enums.Role;
        avatarColor: string;
        initials: string;
    }>;
    remove(familyAccountId: string, id: string): Promise<void>;
}
