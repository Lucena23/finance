import { Category } from '@prisma/client';
import { FamilyScope } from '../common/interceptors/family-scope.interceptor';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
export declare class CategoryController {
    private readonly categoryService;
    constructor(categoryService: CategoryService);
    findAll(scope: FamilyScope): Promise<Category[]>;
    create(scope: FamilyScope, user: AuthenticatedUser, dto: CreateCategoryDto): Promise<Category>;
    update(scope: FamilyScope, user: AuthenticatedUser, id: string, dto: UpdateCategoryDto): Promise<Category>;
    remove(scope: FamilyScope, user: AuthenticatedUser, id: string): Promise<void>;
}
