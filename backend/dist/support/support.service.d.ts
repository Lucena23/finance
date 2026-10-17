import { ConfigService } from '@nestjs/config';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { CreateSupportMessageDto } from './dto/create-support-message.dto';
export interface SupportMessageResult {
    delivered: boolean;
    message: string;
}
export declare class SupportService {
    private readonly config;
    private readonly logger;
    constructor(config: ConfigService);
    sendToTelegram(user: AuthenticatedUser, dto: CreateSupportMessageDto): Promise<SupportMessageResult>;
    private buildTelegramMessage;
    private escapeHtml;
}
