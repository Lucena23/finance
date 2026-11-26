import { ConfigService } from '@nestjs/config';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { PlanService } from '../plan/plan.service';
import { DeepSeekService, IaKsurimChatResponse } from './deepseek.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { CreateSupportMessageDto } from './dto/create-support-message.dto';
import { PublicSupportFormDto } from './dto/public-support-form.dto';
export interface SupportMessageResult {
    delivered: boolean;
    message: string;
}
export interface SupportChatResult extends IaKsurimChatResponse {
    isUpsell?: boolean;
}
export declare class SupportService {
    private readonly config;
    private readonly deepSeekService;
    private readonly planService;
    private readonly logger;
    private readonly ipRateLimits;
    constructor(config: ConfigService, deepSeekService: DeepSeekService, planService: PlanService);
    private checkRateLimit;
    chatPublic(dto: ChatMessageDto, clientIp?: string): Promise<SupportChatResult>;
    chatAuthenticated(user: AuthenticatedUser, dto: ChatMessageDto): Promise<SupportChatResult>;
    sendPublicSupportForm(dto: PublicSupportFormDto, clientIp?: string): Promise<SupportMessageResult>;
    sendToTelegram(user: AuthenticatedUser, dto: CreateSupportMessageDto): Promise<SupportMessageResult>;
    private dispatchTelegramMessage;
    private buildTelegramMessage;
    private isHumanEscalationRequest;
    private notifyTelegramHumanEscalation;
    private notifyTelegramPublicEscalation;
    private escapeHtml;
}
