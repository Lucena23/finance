import type { Request } from 'express';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { ChatMessageDto } from './dto/chat-message.dto';
import { CreateSupportMessageDto } from './dto/create-support-message.dto';
import { PublicSupportFormDto } from './dto/public-support-form.dto';
import { SupportChatResult, SupportMessageResult, SupportService } from './support.service';
export declare class SupportController {
    private readonly supportService;
    constructor(supportService: SupportService);
    chatPublic(dto: ChatMessageDto, req: Request): Promise<SupportChatResult>;
    sendPublicForm(dto: PublicSupportFormDto, req: Request): Promise<SupportMessageResult>;
    chatAuthenticated(user: AuthenticatedUser, dto: ChatMessageDto): Promise<SupportChatResult>;
    send(user: AuthenticatedUser, dto: CreateSupportMessageDto): Promise<SupportMessageResult>;
}
