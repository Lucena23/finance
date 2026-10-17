import { PrismaService } from '../prisma/prisma.service';
import { CreateFamilyAccountDto } from './dto/create-family-account.dto';
import { UpdateFamilyAccountDto } from './dto/update-family-account.dto';
export interface FamilyAccountView {
    id: string;
    name: string;
    ownerCpfMasked: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare class FamilyAccountService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateFamilyAccountDto): Promise<FamilyAccountView>;
    findCurrent(familyAccountId: string): Promise<FamilyAccountView>;
    update(familyAccountId: string, dto: UpdateFamilyAccountDto): Promise<FamilyAccountView>;
    private toView;
}
