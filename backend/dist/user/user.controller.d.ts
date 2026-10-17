import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FamilyScope } from '../common/interceptors/family-scope.interceptor';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    create(scope: FamilyScope, createUserDto: CreateUserDto): Promise<{
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
    findAll(scope: FamilyScope): Promise<{
        id: string;
        email: string;
        name: string;
        role: import(".prisma/client").$Enums.Role;
        avatarColor: string;
        initials: string;
        createdAt: Date;
    }[]>;
    update(scope: FamilyScope, id: string, updateUserDto: UpdateUserDto): Promise<{
        id: string;
        email: string;
        name: string;
        role: import(".prisma/client").$Enums.Role;
        avatarColor: string;
        initials: string;
    }>;
    remove(scope: FamilyScope, id: string): Promise<void>;
}
