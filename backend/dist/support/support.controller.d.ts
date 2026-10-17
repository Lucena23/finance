import { AuthenticatedUser } from '../auth/jwt.strategy';
import { CreateSupportMessageDto } from './dto/create-support-message.dto';
import { SupportMessageResult, SupportService } from './support.service';
export declare class SupportController {
    private readonly supportService;
    constructor(supportService: SupportService);
    send(user: AuthenticatedUser, dto: CreateSupportMessageDto): Promise<SupportMessageResult>;
}
