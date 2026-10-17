export declare class PushSubscriptionKeysDto {
    p256dh: string;
    auth: string;
}
export declare class SubscribePushDto {
    endpoint: string;
    keys: PushSubscriptionKeysDto;
}
