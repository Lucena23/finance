import { Category, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PlanService } from '../plan/plan.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
export declare class CategoryService {
    private readonly prisma;
    private readonly planService?;
    constructor(prisma: PrismaService, planService?: PlanService | undefined);
    findAll(familyAccountId: string): Promise<Category[]>;
    create(familyAccountId: string, dto: CreateCategoryDto, userRole?: Role): Promise<Category>;
    update(familyAccountId: string, id: string, dto: UpdateCategoryDto, userRole?: Role): Promise<Category>;
    remove(familyAccountId: string, id: string, userRole?: Role): Promise<void>;
    private findOneOrFail;
}
