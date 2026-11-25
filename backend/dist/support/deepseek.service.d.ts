import { ConfigService } from '@nestjs/config';
export interface DeepSeekChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
export interface IaKsurimChatResponse {
    reply: string;
    quickReplies?: string[];
    isCommercialClose?: boolean;
}
export declare class DeepSeekService {
    private readonly config;
    private readonly logger;
    private readonly apiUrl;
    private readonly apiKey?;
    private readonly model;
    constructor(config: ConfigService);
    generateReply(userMessage: string, history?: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>, contextType?: 'PUBLIC_FRONTPAGE' | 'AUTHENTICATED_PREMIUM', turnNumber?: number, userName?: string): Promise<IaKsurimChatResponse>;
    private parseReplyAndButtons;
    private deriveQuickReplies;
    private fallbackResponse;
}
