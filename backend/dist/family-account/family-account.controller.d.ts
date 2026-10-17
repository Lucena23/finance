import { FamilyScope } from '../common/interceptors/family-scope.interceptor';
import { CreateFamilyAccountDto } from './dto/create-family-account.dto';
import { UpdateFamilyAccountDto } from './dto/update-family-account.dto';
import { FamilyAccountService, FamilyAccountView } from './family-account.service';
export declare class FamilyAccountController {
    private readonly familyAccountService;
    constructor(familyAccountService: FamilyAccountService);
    create(dto: CreateFamilyAccountDto): Promise<FamilyAccountView>;
    findCurrent(scope: FamilyScope): Promise<FamilyAccountView>;
    update(scope: FamilyScope, dto: UpdateFamilyAccountDto): Promise<FamilyAccountView>;
}
