export declare class ChatTurnDto {
    role: 'user' | 'assistant';
    content: string;
}
export declare class ChatMessageDto {
    message: string;
    sessionId?: string;
    history?: ChatTurnDto[];
}
